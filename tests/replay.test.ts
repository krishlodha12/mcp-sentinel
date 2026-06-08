import { describe, it, expect, beforeAll } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runReplay } from "../src/replay/engine.js";
import type { ReplayResult, ReplaySummary } from "../src/replay/types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function replayDir(name: string, options?: Parameters<typeof runReplay>[1]) {
  return runReplay(resolve(root, "fixtures/replay", name), options);
}

function exploitedIds(results: ReplayResult[]): Set<string> {
  return new Set(
    results.filter((r) => r.outcome === "exploited").map((r) => r.attackId)
  );
}

function exploitRate(summary: ReplaySummary): number {
  return summary.exploited / summary.attacksRun;
}

describe("vulnerable-agent replay fixture", () => {
  let summary: ReplaySummary;
  let exploited: Set<string>;

  beforeAll(async () => {
    summary = await replayDir("vulnerable-agent");
    exploited = exploitedIds(summary.results);
  });

  it("runs the full attack corpus", () => {
    expect(summary.attacksRun).toBeGreaterThanOrEqual(20);
  });

  it("has high exploit rate (broken agent)", () => {
    expect(exploitRate(summary)).toBeGreaterThanOrEqual(0.6);
  });

  it("exploits core injection and shell attacks", () => {
    expect(exploited.has("hidden-tool-instruction")).toBe(true);
    expect(exploited.has("shell-run-command")).toBe(true);
    expect(exploited.has("secret-env-exfil")).toBe(true);
  });

  it("includes Phase 1 static findings", () => {
    expect(summary.staticScan.bySeverity.critical + summary.staticScan.bySeverity.high).toBeGreaterThan(0);
  });
});

describe("clean-agent replay fixture", () => {
  let summary: ReplaySummary;
  let exploited: Set<string>;

  beforeAll(async () => {
    summary = await replayDir("clean-agent");
    exploited = exploitedIds(summary.results);
  });

  it("blocks most attacks", () => {
    expect(exploitRate(summary)).toBeLessThanOrEqual(0.15);
  });

  it("does not exploit shell or hidden-instruction chains", () => {
    expect(exploited.has("shell-run-command")).toBe(false);
    expect(exploited.has("hidden-tool-instruction")).toBe(false);
    expect(exploited.has("secret-env-exfil")).toBe(false);
  });

  it("static scan stays clean (no critical/high/medium)", () => {
    const bad = summary.staticScan.findings.filter((f) =>
      ["critical", "high", "medium"].includes(f.severity)
    );
    expect(bad.length).toBe(0);
  });
});

describe("real-world replay fixture (CVE-2025-6514)", () => {
  let summary: ReplaySummary;
  let exploited: Set<string>;

  beforeAll(async () => {
    summary = await replayDir("real-world");
    exploited = exploitedIds(summary.results);
  });

  it("flags CVE in static scan", () => {
    const cves = summary.staticScan.findings.filter((f) => f.cve).map((f) => f.cve);
    expect(cves).toContain("CVE-2025-6514");
  });

  it("exploits CVE-specific replay attacks", () => {
    expect(exploited.has("cve-known-package")).toBe(true);
    expect(exploited.has("mcp-remote-oauth-bypass")).toBe(true);
  });

  it("exploits unpinned npx supply-chain attack", () => {
    expect(exploited.has("unpinned-npx-pull")).toBe(true);
  });
});

const liveReplay = process.env.LIVE_REPLAY === "1";

describe.skipIf(!liveReplay)("live replay integration", () => {
  it("merges runtime tools from official filesystem server", async () => {
    const summary = await replayDir("clean-agent", { live: true });
    expect(summary.liveProbe?.enabled).toBe(true);
    expect(summary.liveProbe?.liveToolsMerged).toBeGreaterThan(0);
    const fs = summary.liveProbe?.servers.find((s) => s.serverName === "filesystem");
    expect(fs?.status).toBe("connected");
  }, 120_000);
});
