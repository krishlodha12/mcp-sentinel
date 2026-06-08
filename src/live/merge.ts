import type { ScanTarget, ToolDefinition } from "../scanner/types.js";
import type { LiveToolInfo, ServerProbeResult } from "./types.js";

function liveToolToDefinition(tool: LiveToolInfo, serverName: string, index: number): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    sourcePath: `live://${serverName}.tools[${index}]`,
  };
}

/** Merge runtime tools from live probe into existing scan targets (same server name). */
export function mergeLiveToolsIntoTargets(
  targets: ScanTarget[],
  servers: ServerProbeResult[]
): ScanTarget[] {
  const merged = targets.map((t) => ({
    ...t,
    tools: [...t.tools],
    prompts: [...t.prompts],
    resources: [...t.resources],
  }));

  for (const server of servers) {
    if (server.status !== "connected" || server.tools.length === 0) continue;

    let target = merged.find((t) => t.serverName === server.serverName);
    if (!target) {
      target = {
        serverName: server.serverName,
        sourceFile: "",
        sourceKind: "mcp-config",
        tools: [],
        prompts: [],
        resources: [],
        packages: [],
        rawEnv: {},
        commandLine: server.commandLine,
        remoteUrls: server.remoteUrl ? [server.remoteUrl] : [],
      };
      merged.push(target);
    }

    const names = new Set(target.tools.map((t) => t.name));
    server.tools.forEach((tool, i) => {
      if (names.has(tool.name)) return;
      target!.tools.push(liveToolToDefinition(tool, server.serverName, i));
      names.add(tool.name);
    });

    const promptNames = new Set(target.prompts.map((p) => p.name));
    server.prompts.forEach((p, i) => {
      if (promptNames.has(p.name)) return;
      target!.prompts.push({
        name: p.name,
        description: p.description ?? "",
        sourcePath: `live://${server.serverName}.prompts[${i}]`,
      });
      promptNames.add(p.name);
    });

    const resourceNames = new Set(target.resources.map((r) => r.name));
    server.resources.forEach((r, i) => {
      if (resourceNames.has(r.name)) return;
      target!.resources.push({
        name: r.name,
        description: r.description ?? "",
        uri: r.uri,
        sourcePath: `live://${server.serverName}.resources[${i}]`,
      });
      resourceNames.add(r.name);
    });
  }

  return merged;
}

export function countMergedLiveTools(
  before: ScanTarget[],
  after: ScanTarget[]
): number {
  const beforeCount = before.reduce((n, t) => n + t.tools.length, 0);
  const afterCount = after.reduce((n, t) => n + t.tools.length, 0);
  return Math.max(0, afterCount - beforeCount);
}
