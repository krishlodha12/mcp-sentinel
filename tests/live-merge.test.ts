import { describe, it, expect } from "vitest";
import { mergeLiveToolsIntoTargets } from "../src/live/merge.js";
import type { ScanTarget } from "../src/scanner/types.js";
import type { ServerProbeResult } from "../src/live/types.js";

describe("mergeLiveToolsIntoTargets", () => {
  const base: ScanTarget[] = [
    {
      serverName: "filesystem",
      sourceFile: "mcp.json",
      sourceKind: "mcp-config",
      tools: [{ name: "read_file", description: "old", sourcePath: "x" }],
      prompts: [],
      resources: [],
      packages: [],
      rawEnv: {},
      commandLine: "npx filesystem",
      remoteUrls: [],
    },
  ];

  const probe: ServerProbeResult[] = [
    {
      serverName: "filesystem",
      transport: "stdio",
      status: "connected",
      durationMs: 10,
      tools: [
        { name: "read_file", description: "live read" },
        { name: "write_file", description: "live write" },
      ],
      prompts: [],
      resources: [],
      drift: { onlyInConfig: [], onlyLive: ["write_file"] },
    },
  ];

  it("adds runtime-only tools without duplicating existing names", () => {
    const merged = mergeLiveToolsIntoTargets(base, probe);
    const fs = merged.find((t) => t.serverName === "filesystem");
    expect(fs?.tools.map((t) => t.name)).toEqual(["read_file", "write_file"]);
    expect(fs?.tools[0].description).toBe("old");
  });
});
