import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadTarget } from "../scanner/loaders/config-loader.js";
import type { SandboxSession } from "../replay/types.js";
import { loadMcpConfig } from "../live/mcp-config.js";
import { countMergedLiveTools, mergeLiveToolsIntoTargets } from "../live/merge.js";
import { probeMcpServers } from "../live/probe-servers.js";
import type { ProbeOptions, ServerProbeResult } from "./types.js";

function isMcpConfigFile(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    const data = JSON.parse(readFileSync(path, "utf-8")) as { mcpServers?: unknown };
    return Boolean(data.mcpServers && typeof data.mcpServers === "object");
  } catch {
    return false;
  }
}

export interface LiveEnrichResult {
  servers: ServerProbeResult[];
  liveToolsMerged: number;
  probeDurationMs: number;
}

export async function enrichSandboxLive(
  sandbox: SandboxSession,
  options: ProbeOptions = {}
): Promise<LiveEnrichResult> {
  const start = Date.now();
  const mcpFiles = sandbox.agent.mcpPaths
    .map((p) => resolve(sandbox.path, p))
    .filter(isMcpConfigFile);

  const allServers: ServerProbeResult[] = [];
  const targetsBefore = sandbox.targets;

  for (const mcpFile of mcpFiles) {
    const parsed = loadMcpConfig(mcpFile);
    const staticTargets = loadTarget(mcpFile);
    const probed = await probeMcpServers(parsed.servers, staticTargets, options);
    allServers.push(...probed);
  }

  sandbox.targets = mergeLiveToolsIntoTargets(sandbox.targets, allServers);

  return {
    servers: allServers,
    liveToolsMerged: countMergedLiveTools(targetsBefore, sandbox.targets),
    probeDurationMs: Date.now() - start,
  };
}
