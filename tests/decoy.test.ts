import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runDecoy } from "../src/decoy/engine.js";
import { routeToDecoy, pickGhostTool } from "../src/decoy/router.js";
import { loadCatalog } from "../src/decoy/generator.js";
import type { DecoySummary } from "../src/decoy/types.js";
import type { ReplayResult } from "../src/replay/types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function decoyDir(name: string): DecoySummary {
  return runDecoy(resolve(root, "fixtures/replay", name));
}

describe("ghost tool catalog", () => {
  const catalog = loadCatalog();

  it("loads default catalog with get/set/execute tools", () => {
    expect(catalog.tools.length).toBeGreaterThanOrEqual(5);
    const kinds = new Set(catalog.tools.map((t) => t.kind));
    expect(kinds.has("get")).toBe(true);
    expect(kinds.has("set")).toBe(true);
    expect(kinds.has("execute")).toBe(true);
  });
});

describe("decoy router", () => {
  const catalog = loadCatalog();

  it("maps exfiltration attacks to get-style ghost tools", () => {
    const attack: ReplayResult = {
      attackId: "secret-env-exfil",
      attackName: "Secret env exfil",
      category: "exfiltration",
      owasp: "ASI02",
      outcome: "exploited",
      turns: 1,
      evidence: [],
    };
    const ghost = pickGhostTool(attack, catalog.tools);
    expect(ghost?.kind).toBe("get");
    expect(ghost?.routesCategories).toContain("exfiltration");
  });

  it("maps privilege-escalation to execute ghost tools", () => {
    const attack: ReplayResult = {
      attackId: "shell-run-command",
      attackName: "Shell command",
      category: "privilege-escalation",
      owasp: "ASI05",
      outcome: "exploited",
      turns: 1,
      evidence: [],
    };
    const ghost = pickGhostTool(attack, catalog.tools);
    expect(ghost?.kind).toBe("execute");
  });
});

describe("vulnerable-agent decoy fixture", () => {
  const summary = decoyDir("vulnerable-agent");

  it("runs dual-path decoy + real hardening", () => {
    expect(summary.before.attacksRun).toBeGreaterThanOrEqual(20);
    expect(summary.after.attacksRun).toBe(summary.before.attacksRun);
    expect(summary.ghostToolsInjected.length).toBeGreaterThanOrEqual(5);
  });

  it("starts with high exploit rate on real weak path", () => {
    expect(summary.score.realExploitRateBefore).toBeGreaterThanOrEqual(0.6);
  });

  it("routes exploited attacks to decoy ghost tools", () => {
    expect(summary.score.attacksRouted).toBeGreaterThanOrEqual(15);
    expect(summary.score.detections).toBe(summary.score.attacksRouted);
    expect(summary.score.triggerRate).toBe(1);
  });

  it("hardens real path while decoy catches routed attacks", () => {
    expect(summary.score.realExploitRateAfter).toBeLessThan(
      summary.score.realExploitRateBefore
    );
    expect(summary.score.realExploitedDelta).toBeGreaterThanOrEqual(8);
    expect(summary.mutations.length).toBeGreaterThan(0);
  });

  it("records detection per exploited attack", () => {
    const ids = new Set(summary.detections.map((d) => d.attackId));
    expect(ids.size).toBe(summary.score.detections);
    for (const d of summary.detections) {
      expect(d.routed).toBe(true);
      expect(d.ghostTool.length).toBeGreaterThan(0);
      expect(d.evidence).toContain("AICON routed");
    }
  });
});

describe("clean-agent decoy fixture", () => {
  const summary = decoyDir("clean-agent");

  it("already blocks most attacks — minimal routing", () => {
    expect(summary.score.realExploitRateBefore).toBeLessThanOrEqual(0.15);
  });

  it("produces few or no decoy triggers", () => {
    expect(summary.score.attacksRouted).toBeLessThanOrEqual(4);
    expect(summary.score.detections).toBe(summary.score.attacksRouted);
  });

  it("applies no real-path mutations", () => {
    const applied = summary.mutations.filter((m) => m.kind !== "recommendation");
    expect(applied.length).toBe(0);
  });
});

describe("real-world decoy fixture (CVE-2025-6514)", () => {
  const summary = decoyDir("real-world");

  it("routes remote/OAuth exploit attempts to decoy", () => {
    expect(summary.score.attacksRouted).toBeGreaterThan(0);
    expect(summary.score.triggerRate).toBe(1);
  });

  it("partially hardens real path via trustRemoteTools", () => {
    const fields = summary.mutations
      .filter((m) => m.kind === "policy")
      .map((m) => m.field);
    expect(fields).toContain("trustRemoteTools");
    expect(summary.score.realExploitRateAfter).toBeLessThan(
      summary.score.realExploitRateBefore
    );
  });

  it("still flags CVE config issues on real path after decoy", () => {
    const stillExploited = summary.after.results.filter((r) => r.outcome === "exploited");
    expect(stillExploited.length).toBeGreaterThan(0);
    // Decoy still caught the pre-hardening exploit attempts
    expect(summary.detections.length).toBeGreaterThan(0);
  });
});
