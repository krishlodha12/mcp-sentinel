import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ScanTarget } from "../scanner/types.js";
import {
  extractSpawnPackage,
  isOfficialPackage,
  resolveNpxCommand,
  type McpServerEntry,
} from "./mcp-config.js";
import type {
  LivePromptInfo,
  LiveResourceInfo,
  LiveToolInfo,
  ProbeOptions,
  ServerProbeResult,
} from "./types.js";
import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function stdioEnv(extra?: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  if (extra) Object.assign(env, extra);
  return env;
}

function isPathArg(arg: string): boolean {
  return /^([/\\~]|\.{1,2}[/\\]|[A-Za-z]:[/\\])/.test(arg);
}

function resolveFilesystemArgs(
  args: string[],
  sandboxPaths: boolean
): { args: string[] } {
  if (!sandboxPaths) return { args: [...args] };

  const resolved = [...args];
  let sandboxDir: string | undefined;

  for (let i = 0; i < resolved.length; i++) {
    const arg = resolved[i];
    if (!isPathArg(arg)) continue;
    if (existsSync(arg)) continue;
    sandboxDir ??= mkdtempSync(join(tmpdir(), "mcp-sentinel-probe-"));
    resolved[i] = sandboxDir;
  }

  return { args: resolved };
}

function staticToolsForServer(targets: ScanTarget[], serverName: string): string[] {
  const target = targets.find((t) => t.serverName === serverName);
  return (target?.tools ?? []).map((t) => t.name);
}

function toolDrift(staticNames: string[], liveNames: string[]) {
  const liveSet = new Set(liveNames);
  const staticSet = new Set(staticNames);
  return {
    onlyInConfig: staticNames.filter((n) => !liveSet.has(n)),
    onlyLive: liveNames.filter((n) => !staticSet.has(n)),
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function probeStdioServer(
  serverName: string,
  entry: McpServerEntry,
  options: Required<Pick<ProbeOptions, "allowAnyPackage" | "timeoutMs" | "sandboxPaths">>,
  staticToolNames: string[]
): Promise<ServerProbeResult> {
  const start = Date.now();
  const command = entry.command;
  if (!command) {
    return {
      serverName,
      transport: "stdio",
      status: "skipped",
      durationMs: Date.now() - start,
      tools: [],
      prompts: [],
      resources: [],
      drift: { onlyInConfig: staticToolNames, onlyLive: [] },
      skipReason: "No command field — not a stdio server",
    };
  }

  const packageId = extractSpawnPackage(command, entry.args);
  if (packageId && !options.allowAnyPackage && !isOfficialPackage(packageId)) {
    return {
      serverName,
      transport: "stdio",
      status: "skipped",
      packageId,
      commandLine: [command, ...(entry.args ?? [])].join(" "),
      durationMs: Date.now() - start,
      tools: [],
      prompts: [],
      resources: [],
      drift: { onlyInConfig: staticToolNames, onlyLive: [] },
      skipReason: `Package not on official allowlist: ${packageId}. Pass --allow-any-package to override.`,
    };
  }

  const { args: resolvedArgs } = resolveFilesystemArgs(entry.args ?? [], options.sandboxPaths);
  const commandLine = [command, ...resolvedArgs].join(" ");

  const transport = new StdioClientTransport({
    command: resolveNpxCommand(command),
    args: resolvedArgs,
    env: stdioEnv(entry.env),
    stderr: "pipe",
  });

  const stderrChunks: string[] = [];
  const stderrStream = transport.stderr;
  if (stderrStream) {
    stderrStream.on("data", (chunk: Buffer | string) => {
      stderrChunks.push(String(chunk));
    });
  }

  const client = new Client({ name: "mcp-sentinel-probe", version: "0.1.0" });

  try {
    await withTimeout(client.connect(transport), options.timeoutMs, serverName);

    const toolsResult = await withTimeout(client.listTools(), options.timeoutMs, `${serverName} listTools`);
    const promptsResult = await withTimeout(
      client.listPrompts().catch(() => ({ prompts: [] })),
      options.timeoutMs,
      `${serverName} listPrompts`
    );
    const resourcesResult = await withTimeout(
      client.listResources().catch(() => ({ resources: [] })),
      options.timeoutMs,
      `${serverName} listResources`
    );

    const tools: LiveToolInfo[] = (toolsResult.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? "",
      inputSchema: t.inputSchema as Record<string, unknown> | undefined,
    }));

    const prompts: LivePromptInfo[] = (promptsResult.prompts ?? []).map((p) => ({
      name: p.name,
      description: p.description,
    }));

    const resources: LiveResourceInfo[] = (resourcesResult.resources ?? []).map((r) => ({
      name: r.name,
      uri: r.uri,
      description: r.description,
    }));

    const liveNames = tools.map((t) => t.name);

    return {
      serverName,
      transport: "stdio",
      status: "connected",
      packageId,
      commandLine,
      durationMs: Date.now() - start,
      tools,
      prompts,
      resources,
      drift: toolDrift(staticToolNames, liveNames),
    };
  } catch (err) {
    const stderr = stderrChunks.join("").trim();
    const base = err instanceof Error ? err.message : String(err);
    return {
      serverName,
      transport: "stdio",
      status: "failed",
      packageId,
      commandLine,
      durationMs: Date.now() - start,
      tools: [],
      prompts: [],
      resources: [],
      drift: { onlyInConfig: staticToolNames, onlyLive: [] },
      error: stderr ? `${base} — stderr: ${stderr.slice(0, 400)}` : base,
    };
  } finally {
    try {
      await client.close();
    } catch {
      /* best effort */
    }
  }
}

export async function probeMcpServers(
  servers: Array<{ name: string; entry: McpServerEntry }>,
  staticTargets: ScanTarget[],
  options: ProbeOptions = {}
): Promise<ServerProbeResult[]> {
  const allowRemote = options.allowRemote === true;
  const allowAnyPackage = options.allowAnyPackage === true;
  const timeoutMs = options.timeoutMs ?? 45_000;
  const sandboxPaths = options.sandboxPaths !== false;
  const stdioOnly = options.stdioOnly !== false;

  const results: ServerProbeResult[] = [];

  for (const { name, entry } of servers) {
    const staticToolNames = staticToolsForServer(staticTargets, name);

    if (entry.url) {
      results.push({
        serverName: name,
        transport: "remote",
        status: "skipped",
        remoteUrl: entry.url,
        durationMs: 0,
        tools: [],
        prompts: [],
        resources: [],
        drift: { onlyInConfig: staticToolNames, onlyLive: [] },
        skipReason: allowRemote
          ? "Remote HTTP/SSE probe not implemented yet — stdio servers supported"
          : "Remote URL skipped (pass --allow-remote only for endpoints you own)",
      });
      continue;
    }

    if (stdioOnly && !entry.command) {
      results.push({
        serverName: name,
        transport: "stdio",
        status: "skipped",
        durationMs: 0,
        tools: [],
        prompts: [],
        resources: [],
        drift: { onlyInConfig: staticToolNames, onlyLive: [] },
        skipReason: "No stdio command",
      });
      continue;
    }

    results.push(
      await probeStdioServer(
        name,
        entry,
        { allowAnyPackage, timeoutMs, sandboxPaths },
        staticToolNames
      )
    );
  }

  return results;
}
