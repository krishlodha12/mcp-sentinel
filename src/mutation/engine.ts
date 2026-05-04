import { cpSync } from "node:fs";
import { join } from "node:path";
import { discoverAgentFixture } from "../replay/sandbox.js";
import { createSandbox } from "../replay/sandbox.js";
import { loadCorpus, runReplayOnSandbox } from "../replay/engine.js";
import type { MutationOptions, MutationScore, MutationSummary } from "./types.js";
import { planMutations } from "./planner.js";
import { applyMutations, persistAgent } from "./apply.js";

function scoreFromReplay(before: MutationSummary["before"], after: MutationSummary["after"]): MutationScore {
  const exploitRateBefore =
    before.attacksRun > 0 ? before.exploited / before.attacksRun : 0;
  const exploitRateAfter =
    after.attacksRun > 0 ? after.exploited / after.attacksRun : 0;

  return {
    exploitRateBefore,
    exploitRateAfter,
    exploitedBefore: before.exploited,
    exploitedAfter: after.exploited,
    blockedBefore: before.blocked,
    blockedAfter: after.blocked,
    exploitedDelta: before.exploited - after.exploited,
    blockedDelta: after.blocked - before.blocked,
  };
}

export function runMutation(
  agentFixturePath: string,
  options: MutationOptions = {}
): MutationSummary {
  const start = Date.now();
  const agentDir = discoverAgentFixture(agentFixturePath);
  const corpus = loadCorpus(options.corpusPath);
  const sandbox = createSandbox(agentDir);

  try {
    const before = runReplayOnSandbox(sandbox, corpus, start);
    const plans = planMutations(sandbox.agent, before.results);
    const { agent: hardened, mutations } = applyMutations(sandbox.agent, plans);

    persistAgent(sandbox.path, hardened);
    sandbox.agent = hardened;

    const after = runReplayOnSandbox(sandbox, corpus, start);

    if (options.writeBack) {
      cpSync(join(sandbox.path, "agent.json"), join(agentDir, "agent.json"));
    }

    return {
      agentName: sandbox.agent.name,
      sandboxPath: sandbox.path,
      corpusVersion: corpus.version,
      before,
      after,
      mutations,
      score: scoreFromReplay(before, after),
      mutatedAt: new Date().toISOString(),
      mutationDurationMs: Date.now() - start,
    };
  } finally {
    if (!options.keepSandbox) {
      sandbox.cleanup();
    }
  }
}
