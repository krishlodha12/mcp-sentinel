import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMutation } from "../src/mutation/engine.js";
import type { MutationSummary } from "../src/mutation/types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function mutateDir(name: string): MutationSummary {
  return runMutation(resolve(root, "fixtures/replay", name));
}

describe("vulnerable-agent mutation fixture", () => {
  const summary = mutateDir("vulnerable-agent");

  it("runs before and after replay", () => {
    expect(summary.before.attacksRun).toBeGreaterThanOrEqual(20);
    expect(summary.after.attacksRun).toBe(summary.before.attacksRun);
  });

  it("starts with high exploit rate (broken agent)", () => {
    expect(summary.score.exploitRateBefore).toBeGreaterThanOrEqual(0.6);
  });

  it("hardens policies and system prompt", () => {
    const fields = summary.mutations
      .filter((m) => m.kind !== "recommendation")
      .map((m) => m.field);
    expect(fields).toContain("followHiddenToolInstructions");
    expect(fields).toContain("allowShellExecution");
    expect(fields).toContain("systemPrompt");
  });

  it("reduces exploit rate after mutation", () => {
    expect(summary.score.exploitRateAfter).toBeLessThan(
      summary.score.exploitRateBefore
    );
    expect(summary.score.exploitedDelta).toBeGreaterThanOrEqual(8);
  });

  it("blocks core injection and shell attacks after hardening", () => {
    const afterExploited = new Set(
      summary.after.results
        .filter((r) => r.outcome === "exploited")
        .map((r) => r.attackId)
    );
    expect(afterExploited.has("hidden-tool-instruction")).toBe(false);
    expect(afterExploited.has("shell-run-command")).toBe(false);
    expect(afterExploited.has("secret-env-exfil")).toBe(false);
  });

  it("emits config recommendations for remaining exploits", () => {
    const recs = summary.mutations.filter((m) => m.kind === "recommendation");
    expect(recs.length).toBeGreaterThan(0);
  });
});

describe("clean-agent mutation fixture", () => {
  const summary = mutateDir("clean-agent");

  it("already blocks most attacks", () => {
    expect(summary.score.exploitRateBefore).toBeLessThanOrEqual(0.15);
  });

  it("applies no policy or prompt mutations", () => {
    const applied = summary.mutations.filter((m) => m.kind !== "recommendation");
    expect(applied.length).toBe(0);
  });

  it("does not worsen exploit rate", () => {
    expect(summary.score.exploitRateAfter).toBeLessThanOrEqual(
      summary.score.exploitRateBefore
    );
  });
});

describe("real-world mutation fixture (CVE-2025-6514)", () => {
  const summary = mutateDir("real-world");

  it("tightens trustRemoteTools after replay failures", () => {
    const policy = summary.mutations.find(
      (m) => m.kind === "policy" && m.field === "trustRemoteTools"
    );
    expect(policy).toBeDefined();
    expect(policy?.after).toBe(false);
  });

  it("blocks OAuth and HTTP remote attacks after mutation", () => {
    const afterExploited = new Set(
      summary.after.results
        .filter((r) => r.outcome === "exploited")
        .map((r) => r.attackId)
    );
    expect(afterExploited.has("mcp-remote-oauth-bypass")).toBe(false);
    expect(afterExploited.has("remote-gateway-ssrf")).toBe(false);
  });

  it("still flags CVE in static scan (config not auto-fixed)", () => {
    const cves = summary.after.staticScan.findings
      .filter((f) => f.cve)
      .map((f) => f.cve);
    expect(cves).toContain("CVE-2025-6514");
  });

  it("still exploits CVE-specific static attacks", () => {
    const afterExploited = new Set(
      summary.after.results
        .filter((r) => r.outcome === "exploited")
        .map((r) => r.attackId)
    );
    expect(afterExploited.has("cve-known-package")).toBe(true);
    expect(afterExploited.has("unpinned-npx-pull")).toBe(true);
  });
});
