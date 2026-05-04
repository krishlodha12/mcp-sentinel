import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runReplay } from "../src/replay/engine.js";
import type { ReplayResult } from "../src/replay/types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function replayDir(name: string) {
  return runReplay(resolve(root, "fixtures/replay", name));
}

function exploitedIds(results: ReplayResult[]): Set<string> {
  return new Set(
    results.filter((r) => r.outcome === "exploited").map((r) => r.attackId)
  );
}

function exploitRate(summary: ReturnType<typeof runReplay>): number {
  return summary.exploited / summary.attacksRun;
}

describe("vulnerable-agent replay fixture", () => {
  const summary = replayDir("vulnerable-agent");
  const exploited = exploitedIds(summary.results);

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
  const summary = replayDir("clean-agent");
  const exploited = exploitedIds(summary.results);

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
  const summary = replayDir("real-world");
  const exploited = exploitedIds(summary.results);

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
