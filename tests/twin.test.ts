import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runTwin } from "../src/twin/engine.js";
import { loadFleet } from "../src/twin/fleet.js";
import {
  createLedger,
  mergeExploitEvidence,
  publishProbeIntel,
} from "../src/twin/intel.js";
import type { TwinSummary } from "../src/twin/types.js";
import type { ReplayResult } from "../src/replay/types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function twinFleet(name: string): TwinSummary {
  return runTwin(resolve(root, "fixtures/twin", name));
}

describe("fleet loader", () => {
  it("loads vulnerable-fleet with scout and worker", () => {
    const { config } = loadFleet(resolve(root, "fixtures/twin/vulnerable-fleet"));
    expect(config.agents).toHaveLength(2);
    expect(config.agents.map((a) => a.id)).toEqual(["scout", "worker"]);
  });
});

describe("intel bus", () => {
  it("merges sibling exploit intel for cross-harden planning", () => {
    const ledger = createLedger("test", "1.0");
    const siblingExploit: ReplayResult = {
      attackId: "shell-run-command",
      attackName: "Shell command",
      category: "privilege-escalation",
      owasp: "ASI05",
      outcome: "exploited",
      turns: 1,
      evidence: [{ kind: "policy", message: "allowShellExecution=true" }],
    };
    publishProbeIntel(ledger, "scout", "scout-agent", [siblingExploit], 1);

    const localBlocked: ReplayResult = {
      ...siblingExploit,
      outcome: "blocked",
      evidence: [{ kind: "policy", message: "allowShellExecution=false" }],
    };

    const merged = mergeExploitEvidence([localBlocked], ledger, "worker");
    expect(merged.some((r) => r.attackId === "shell-run-command")).toBe(true);
    expect(
      merged.find((r) => r.attackId === "shell-run-command")?.evidence.some((e) =>
        e.message.includes("Fleet intel")
      )
    ).toBe(true);
  });
});

describe("vulnerable-fleet twin fixture", () => {
  const summary = twinFleet("vulnerable-fleet");

  it("runs closed loop across scout and worker", () => {
    expect(summary.agents).toHaveLength(2);
    expect(summary.score.intelEntries).toBeGreaterThan(40);
    expect(summary.ledger.watchlist.length).toBeGreaterThan(10);
  });

  it("starts with high fleet exploit rate", () => {
    expect(summary.score.fleetExploitRateBefore).toBeGreaterThanOrEqual(0.5);
  });

  it("shares intel between agents", () => {
    const worker = summary.agents.find((a) => a.agentId === "worker")!;
    expect(worker.intelReceived.length).toBeGreaterThan(0);
    expect(worker.intelContributed.length).toBeGreaterThan(0);
  });

  it("improves fleet posture after closed loop", () => {
    expect(summary.score.fleetExploitRateAfter).toBeLessThan(
      summary.score.fleetExploitRateBefore
    );
    expect(summary.score.fleetExploitedDelta).toBeGreaterThanOrEqual(8);
  });

  it("routes fleet exploits to decoy ghost tools", () => {
    expect(summary.score.decoyDetections).toBeGreaterThan(10);
    expect(summary.score.decoyCatchRate).toBe(1);
  });

  it("applies mutations on both agents", () => {
    for (const pass of summary.agents) {
      const applied = pass.mutations.filter((m) => m.kind !== "recommendation");
      expect(applied.length).toBeGreaterThan(0);
    }
  });
});

describe("clean-fleet twin fixture", () => {
  const summary = twinFleet("clean-fleet");

  it("already blocks most attacks", () => {
    expect(summary.score.fleetExploitRateBefore).toBeLessThanOrEqual(0.15);
  });

  it("produces minimal decoy routing", () => {
    expect(summary.score.decoyDetections).toBeLessThanOrEqual(8);
  });

  it("applies no cross-harden mutations", () => {
    for (const pass of summary.agents) {
      const applied = pass.mutations.filter((m) => m.kind !== "recommendation");
      expect(applied.length).toBe(0);
    }
  });

  it("keeps fleet exploit rate stable", () => {
    expect(summary.score.fleetExploitRateAfter).toBeLessThanOrEqual(0.15);
  });
});

describe("real-world-fleet twin fixture (CVE-2025-6514)", () => {
  const summary = twinFleet("real-world-fleet");

  it("gateway publishes remote exploit intel", () => {
    const gateway = summary.agents.find((a) => a.agentId === "gateway")!;
    expect(gateway.before.exploited).toBeGreaterThan(0);
    expect(gateway.intelContributed.some((e) => e.outcome === "exploited")).toBe(
      true
    );
  });

  it("observer receives gateway intel without local exploits", () => {
    const observer = summary.agents.find((a) => a.agentId === "observer")!;
    expect(observer.intelReceived.length).toBeGreaterThan(0);
    expect(observer.before.exploited).toBeLessThanOrEqual(4);
  });

  it("partially hardens gateway via trustRemoteTools", () => {
    const gateway = summary.agents.find((a) => a.agentId === "gateway")!;
    const fields = gateway.mutations
      .filter((m) => m.kind === "policy")
      .map((m) => m.field);
    expect(fields).toContain("trustRemoteTools");
    expect(gateway.after.exploited).toBeLessThan(gateway.before.exploited);
  });

  it("observer stays hardened — no policy mutations", () => {
    const observer = summary.agents.find((a) => a.agentId === "observer")!;
    const applied = observer.mutations.filter((m) => m.kind !== "recommendation");
    expect(applied.length).toBe(0);
  });

  it("fleet decoy catches gateway watchlist attacks", () => {
    expect(summary.score.decoyDetections).toBeGreaterThan(0);
    expect(summary.score.decoyCatchRate).toBe(1);
  });
});
