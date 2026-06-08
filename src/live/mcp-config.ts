import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface McpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  type?: string;
  headers?: Record<string, string>;
}

export interface ParsedMcpConfig {
  path: string;
  servers: Array<{ name: string; entry: McpServerEntry }>;
}

const OFFICIAL_PREFIX = "@modelcontextprotocol/";

export function loadMcpConfig(path: string): ParsedMcpConfig {
  const abs = resolve(path);
  const data = JSON.parse(readFileSync(abs, "utf-8")) as {
    mcpServers?: Record<string, McpServerEntry>;
  };
  const servers = Object.entries(data.mcpServers ?? {}).map(([name, entry]) => ({
    name,
    entry,
  }));
  if (servers.length === 0) {
    throw new Error(`No mcpServers found in ${abs}`);
  }
  return { path: abs, servers };
}

export function parseNpmIdentifier(raw: string): { identifier: string; version?: string } {
  const full = raw.trim();
  if (full.startsWith("@")) {
    const versionAt = full.indexOf("@", 1);
    if (versionAt > 0) {
      return { identifier: full.slice(0, versionAt), version: full.slice(versionAt + 1) };
    }
    return { identifier: full };
  }
  const versionAt = full.lastIndexOf("@");
  if (versionAt > 0) {
    return { identifier: full.slice(0, versionAt), version: full.slice(versionAt + 1) };
  }
  return { identifier: full };
}

function isPathArg(arg: string): boolean {
  return /^([/\\~]|\.{1,2}[/\\]|[A-Za-z]:[/\\])/.test(arg);
}

export function extractSpawnPackage(
  command?: string,
  args: string[] = []
): string | undefined {
  const joined = [command, ...args].filter(Boolean).join(" ");
  const npxMatch = joined.match(/npx\s+(?:-y\s+)?(@?[\w./-]+(?:@[\w.^~>=<*-]+)?)/);
  if (npxMatch) return parseNpmIdentifier(npxMatch[1]).identifier;

  if (command === "npx" || command === "npx.cmd") {
    const pkgArg = args.find((a) => !a.startsWith("-") && !isPathArg(a));
    if (pkgArg) return parseNpmIdentifier(pkgArg).identifier;
  }
  return undefined;
}

export function isOfficialPackage(packageId: string): boolean {
  return packageId.startsWith(OFFICIAL_PREFIX);
}

export function resolveNpxCommand(command: string): string {
  if (process.platform === "win32" && command === "npx") {
    return "npx.cmd";
  }
  return command;
}
