import { cpSync } from "node:fs";
import { join } from "node:path";
import { createSandbox } from "../replay/sandbox.js";
import { loadCorpus, runReplayOnSandbox } from "../replay/engine.js";
import { planMutations } from "../mutation/planner.js";
import { applyMutations, persistAgent } from "../mutation/apply.js";
import { buildDecoySandbox, loadCatalog } from "../decoy/generator.js";
import { routeToDecoy } from "../decoy/router.js";
import type { ReplayResult } from "../replay/types.js";
import type {
  TwinAgentPass,
  TwinLoopScore,
  TwinOptions,
  TwinSummary,
} from "./types.js";
import { loadFleet, resolveAgentPath } from "./fleet.js";
import {
  createLedger,
  exploitedResultsFromFleet,
  intelReceivedBy,
  mergeExploitEvidence,
  publishProbeIntel,
} from "./intel.js";

interface AgentSession {
  id: string;
  role: TwinAgentPass["role"];
  sandbox: ReturnType<typeof createSandbox>;
  fixtureDir: string;
}

function fleetExploitRate(summaries: { exploited: number; attacksRun: number }[]): number {
  const exploited = summaries.reduce((n, s) => n + s.exploited, 0);
  const attacks = summaries.reduce((n, s) => n + s.attacksRun, 0);
  return attacks > 0 ? exploited / attacks : 0;
}

function scoreFromPasses(
  passes: TwinAgentPass[],
  ledger: ReturnType<typeof createLedger>,
  decoyDetections: TwinSummary["decoyDetections"],
  loopRounds: number
): TwinLoopScore {
  const agents = passes.map((p) => ({
    agentId: p.agentId,
    agentName: p.agentName,
    role: p.role,
    exploitRateBefore:
      p.before.attacksRun > 0 ? p.before.exploited / p.before.attacksRun : 0,
    exploitRateAfter:
      p.after.attacksRun > 0 ? p.after.exploited / p.after.attacksRun : 0,
    exploitedBefore: p.before.exploited,
    exploitedAfter: p.after.exploited,
    exploitedDelta: p.before.exploited - p.after.exploited,
    mutationsApplied: p.mutations.filter((m) => m.kind !== "recommendation").length,
    intelReceived: p.intelReceived.length,
    intelContributed: p.intelContributed.length,
  }));

  const attacksRouted = ledger.watchlist.length;
  const decoyCatchRate =
    attacksRouted > 0 ? decoyDetections.length / attacksRouted : 0;

  return {
    agents,
    fleetExploitRateBefore: fleetExploitRate(passes.map((p) => p.before)),
    fleetExploitRateAfter: fleetExploitRate(passes.map((p) => p.after)),
    fleetExploitedDelta:
      passes.reduce((n, p) => n + p.before.exploited, 0) -
      passes.reduce((n, p) => n + p.after.exploited, 0),
    intelEntries: ledger.entries.length,
    watchlistSize: ledger.watchlist.length,
    decoyDetections: decoyDetections.length,
    decoyCatchRate,
    loopRounds,
  };
}

function planFromFleetIntel(
  agent: AgentSession["sandbox"]["agent"],
  agentId: string,
  localResults: ReplayResult[],
  ledger: ReturnType<typeof createLedger>
): ReturnType<typeof planMutations> {
  const merged = mergeExploitEvidence(localResults, ledger, agentId);
  return planMutations(agent, merged);
}

/**
 * Closed-loop attack twin: probe fleet → publish intel → cross-harden →
 * fleet decoy routing → verify — continuous multi-agent intel sharing.
 */
export function runTwin(fleetPath: string, options: TwinOptions = {}): TwinSummary {
  const start = Date.now();
  const { config, dir } = loadFleet(fleetPath);
  const corpus = loadCorpus(options.corpusPath);
  const catalog = loadCatalog(options.catalogPath);
  const ledger = createLedger(config.name, corpus.version);
  const sessions: AgentSession[] = [];
  let decoySandbox: ReturnType<typeof buildDecoySandbox> | undefined;
  let decoyDetections: TwinSummary["decoyDetections"] = [];

  try {
    for (const ref of config.agents) {
      const fixtureDir = resolveAgentPath(dir, ref);
      sessions.push({
        id: ref.id,
        role: ref.role,
        sandbox: createSandbox(fixtureDir),
        fixtureDir,
      });
    }

    const round = 1;
    const beforeByAgent = new Map<string, ReturnType<typeof runReplayOnSandbox>>();

    for (const session of sessions) {
      const before = runReplayOnSandbox(session.sandbox, corpus, start);
      beforeByAgent.set(session.id, before);
      publishProbeIntel(
        ledger,
        session.id,
        session.sandbox.agent.name,
        before.results,
        round
      );
    }

    const primary = sessions[0];
    decoySandbox = buildDecoySandbox(primary.sandbox, catalog);
    const fleetExploits = exploitedResultsFromFleet(ledger, corpus);
    decoyDetections = routeToDecoy(fleetExploits, catalog.tools, corpus);

    const passes: TwinAgentPass[] = [];

    for (const session of sessions) {
      const before = beforeByAgent.get(session.id)!;
      const contributed = ledger.entries.filter((e) => e.sourceAgentId === session.id);
      const received = intelReceivedBy(ledger, session.id, round);

      const plans = planFromFleetIntel(
        session.sandbox.agent,
        session.id,
        before.results,
        ledger
      );
      const { agent: hardened, mutations } = applyMutations(session.sandbox.agent, plans);
      persistAgent(session.sandbox.path, hardened);
      session.sandbox.agent = hardened;

      const after = runReplayOnSandbox(session.sandbox, corpus, start);

      if (options.writeBack) {
        cpSync(
          join(session.sandbox.path, "agent.json"),
          join(session.fixtureDir, "agent.json")
        );
      }

      passes.push({
        agentId: session.id,
        agentName: session.sandbox.agent.name,
        role: session.role,
        before,
        after,
        mutations,
        intelReceived: received,
        intelContributed: contributed,
      });
    }

    return {
      fleetName: config.name,
      fleetPath: dir,
      corpusVersion: corpus.version,
      ledger,
      agents: passes,
      decoyDetections,
      score: scoreFromPasses(passes, ledger, decoyDetections, options.maxRounds ?? 1),
      twinnedAt: new Date().toISOString(),
      twinDurationMs: Date.now() - start,
    };
  } finally {
    if (!options.keepSandbox) {
      for (const session of sessions) {
        session.sandbox.cleanup();
      }
      decoySandbox?.cleanup();
    }
  }
}
