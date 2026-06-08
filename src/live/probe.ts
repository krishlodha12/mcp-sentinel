import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadTarget } from "../scanner/loaders/config-loader.js";
import { runChecks } from "../scanner/engine.js";
import type { ScanTarget, ToolDefinition } from "../scanner/types.js";
import { loadMcpConfig } from "./mcp-config.js";
import { probeMcpServers } from "./probe-servers.js";
import type { ProbeOptions, ProbeSummary, ServerProbeResult } from "./types.js";

const LEGAL_NOTICE =
  "Live probe spawns only servers declared in your local config. Default: official @modelcontextprotocol/* stdio packages on localhost. Remote URLs require --allow-remote.";

function buildLiveTargets(
  configPath: string,
  servers: ServerProbeResult[]
): ScanTarget[] {
  return servers
    .filter((s) => s.status === "connected" && s.tools.length > 0)
    .map((s) => {
      const tools: ToolDefinition[] = s.tools.map((t, i) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        sourcePath: `live://${s.serverName}.tools[${i}]`,
      }));

      return {
        serverName: `${s.serverName} (live)`,
        sourceFile: configPath,
        sourceKind: "mcp-config" as const,
        tools,
        prompts: s.prompts.map((p, i) => ({
          name: p.name,
          description: p.description ?? "",
          sourcePath: `live://${s.serverName}.prompts[${i}]`,
        })),
        resources: s.resources.map((r, i) => ({
          name: r.name,
          description: r.description ?? "",
          uri: r.uri,
          sourcePath: `live://${s.serverName}.resources[${i}]`,
        })),
        packages: [],
        rawEnv: {},
        commandLine: s.commandLine,
        remoteUrls: s.remoteUrl ? [s.remoteUrl] : [],
      };
    });
}

export async function runProbe(
  configPath: string,
  options: ProbeOptions = {}
): Promise<ProbeSummary> {
  const start = Date.now();
  const abs = resolve(configPath);
  const parsed = loadMcpConfig(abs);
  const staticTargets = loadTarget(abs);
  const staticScan = runChecks(staticTargets);

  const servers = await probeMcpServers(parsed.servers, staticTargets, options);
  const liveTargets = buildLiveTargets(abs, servers);
  const liveScan = liveTargets.length > 0 ? runChecks(liveTargets) : undefined;

  return {
    configPath: abs,
    staticScan,
    liveScan,
    servers,
    probedAt: new Date().toISOString(),
    probeDurationMs: Date.now() - start,
    legalNotice: LEGAL_NOTICE,
  };
}

export { LEGAL_NOTICE };
