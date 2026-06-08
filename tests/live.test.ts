import { describe, expect, it } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractSpawnPackage,
  isOfficialPackage,
  loadMcpConfig,
} from "../src/live/mcp-config.js";
import { runProbe } from "../src/live/probe.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("live mcp-config", () => {
  it("loads official-memory fixture", () => {
    const cfg = loadMcpConfig(resolve(root, "fixtures/live/official-memory/mcp.json"));
    expect(cfg.servers).toHaveLength(1);
    expect(cfg.servers[0].name).toBe("memory");
  });

  it("extracts @modelcontextprotocol package from npx args", () => {
    expect(
      extractSpawnPackage("npx", ["-y", "@modelcontextprotocol/server-memory@2026.1.26"])
    ).toBe("@modelcontextprotocol/server-memory");
  });

  it("flags unofficial packages", () => {
    expect(isOfficialPackage("@modelcontextprotocol/server-memory")).toBe(true);
    expect(isOfficialPackage("mcp-remote")).toBe(false);
  });
});

describe("live probe — allowlist", () => {
  it("skips non-official packages by default", async () => {
    const summary = await runProbe(resolve(root, "fixtures/live/blocked-unofficial/mcp.json"), {
      timeoutMs: 5000,
    });
    const shell = summary.servers.find((s) => s.serverName === "shell-helper");
    expect(shell?.status).toBe("skipped");
    expect(shell?.skipReason).toMatch(/allowlist/);
  });

  it("skips remote URLs without --allow-remote", async () => {
    const summary = await runProbe(resolve(root, "fixtures/replay/clean-agent/mcp.json"), {
      timeoutMs: 5000,
    });
    const remote = summary.servers.find((s) => s.serverName === "secure-remote");
    expect(remote?.status).toBe("skipped");
    expect(remote?.skipReason).toMatch(/allow-remote/);
  });
});

const liveIntegration = process.env.LIVE_PROBE === "1";

describe.skipIf(!liveIntegration)("live probe — integration", () => {
  it("connects to official memory server", async () => {
    const summary = await runProbe(resolve(root, "fixtures/live/official-memory/mcp.json"), {
      timeoutMs: 60_000,
    });
    const memory = summary.servers.find((s) => s.serverName === "memory");
    expect(memory?.status).toBe("connected");
    expect(memory?.tools.length).toBeGreaterThan(0);
  }, 90_000);
});
