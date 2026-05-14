import { cpSync } from "node:fs";
import { join } from "node:path";
import { discoverAgentFixture, createSandbox } from "../replay/sandbox.js";
import { loadCorpus, runReplayOnSandbox } from "../replay/engine.js";
import { planMutations } from "../mutation/planner.js";
import { applyMutations, persistAgent } from "../mutation/apply.js";
import type { DecoyOptions, DecoyRoutingScore, DecoySummary } from "./types.js";
import { buildDecoySandbox, loadCatalog } from "./generator.js";
import { routeToDecoy } from "./router.js";

function scoreFromDecoy(
  before: DecoySummary["before"],
  after: DecoySummary["after"],
  detections: DecoySummary["detections"]
): DecoyRoutingScore {
  const attacksRouted = before.results.filter((r) => r.outcome === "exploited").length;
  const realExploitRateBefore =
    before.attacksRun > 0 ? before.exploited / before.attacksRun : 0;
  const realExploitRateAfter =
    after.attacksRun > 0 ? after.exploited / after.attacksRun : 0;

  return {
    attacksRouted,
    detections: detections.length,
    triggerRate: attacksRouted > 0 ? detections.length / attacksRouted : 0,
    realExploitRateBefore,
    realExploitRateAfter,
    realExploitedDelta: before.exploited - after.exploited,
  };
}

/**
 * AICON decoy flow: replay weak agent → route exploits to ghost-tool decoy →
 * harden real path (Phase 3 mutations) → report dual-path outcome.
 */
export function runDecoy(
  agentFixturePath: string,
  options: DecoyOptions = {}
): DecoySummary {
  const start = Date.now();
  const agentDir = discoverAgentFixture(agentFixturePath);
  const corpus = loadCorpus(options.corpusPath);
  const catalog = loadCatalog(options.catalogPath);
  const realSandbox = createSandbox(agentDir);
  let decoySandbox: ReturnType<typeof buildDecoySandbox> | undefined;

  try {
    const before = runReplayOnSandbox(realSandbox, corpus, start);

    decoySandbox = buildDecoySandbox(realSandbox, catalog);
    const exploitedBefore = before.results.filter((r) => r.outcome === "exploited");
    const detections = routeToDecoy(exploitedBefore, catalog.tools, corpus);

    const plans = planMutations(realSandbox.agent, before.results);
    const { agent: hardened, mutations } = applyMutations(realSandbox.agent, plans);
    persistAgent(realSandbox.path, hardened);
    realSandbox.agent = hardened;

    const after = runReplayOnSandbox(realSandbox, corpus, start);

    if (options.writeBack) {
      cpSync(join(realSandbox.path, "agent.json"), join(agentDir, "agent.json"));
    }

    return {
      agentName: realSandbox.agent.name,
      realSandboxPath: realSandbox.path,
      decoySandboxPath: decoySandbox.path,
      corpusVersion: corpus.version,
      ghostToolsInjected: catalog.tools,
      detections,
      mutations,
      score: scoreFromDecoy(before, after, detections),
      before,
      after,
      decoyedAt: new Date().toISOString(),
      decoyDurationMs: Date.now() - start,
    };
  } finally {
    if (!options.keepSandbox) {
      realSandbox.cleanup();
      decoySandbox?.cleanup();
    }
  }
}

export { loadCatalog };
