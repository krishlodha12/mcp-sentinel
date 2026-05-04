import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AttackCategory,
  AttackCorpus,
  OwaspCategory,
  ReplayOptions,
  ReplayResult,
  ReplaySummary,
  SandboxSession,
} from "./types.js";
import { createSandbox, discoverAgentFixture } from "./sandbox.js";
import { attackExploited } from "./evaluators/conditions.js";

const DEFAULT_CORPUS = join(
  dirname(fileURLToPath(import.meta.url)),
  "corpus",
  "attacks.json"
);

function loadCorpus(path?: string): AttackCorpus {
  const corpusPath = path ?? DEFAULT_CORPUS;
  const raw = JSON.parse(readFileSync(corpusPath, "utf-8")) as AttackCorpus;
  if (!raw.attacks?.length) {
    throw new Error(`Attack corpus empty or invalid: ${corpusPath}`);
  }
  return raw;
}

function emptyCategoryCounts(): Partial<
  Record<AttackCategory, { blocked: number; exploited: number }>
> {
  return {};
}

export function runReplayOnSandbox(
  sandbox: SandboxSession,
  corpus: AttackCorpus,
  start = Date.now()
): ReplaySummary {
  const results: ReplayResult[] = [];
  const byCategory = emptyCategoryCounts();
  const byOwasp: Partial<Record<OwaspCategory, number>> = {};

  for (const attack of corpus.attacks) {
    const { exploited, evidence } = attackExploited({
      agent: sandbox.agent,
      targets: sandbox.targets,
      staticScan: sandbox.staticScan,
      attack,
    });

    const outcome = exploited ? "exploited" : "blocked";
    results.push({
      attackId: attack.id,
      attackName: attack.name,
      category: attack.category,
      owasp: attack.owasp,
      outcome,
      turns: attack.turns.length,
      evidence,
    });

    const cat = byCategory[attack.category] ?? { blocked: 0, exploited: 0 };
    cat[outcome]++;
    byCategory[attack.category] = cat;

    if (outcome === "exploited") {
      byOwasp[attack.owasp] = (byOwasp[attack.owasp] ?? 0) + 1;
    }
  }

  const exploited = results.filter((r) => r.outcome === "exploited").length;
  const blocked = results.length - exploited;

  return {
    agentName: sandbox.agent.name,
    sandboxPath: sandbox.path,
    corpusVersion: corpus.version,
    attacksRun: results.length,
    blocked,
    exploited,
    byCategory,
    byOwasp,
    results,
    staticScan: sandbox.staticScan,
    replayedAt: new Date().toISOString(),
    replayDurationMs: Date.now() - start,
  };
}

export function runReplay(
  agentFixturePath: string,
  options: ReplayOptions = {}
): ReplaySummary {
  const start = Date.now();
  const agentDir = discoverAgentFixture(agentFixturePath);
  const corpus = loadCorpus(options.corpusPath);
  const sandbox = createSandbox(agentDir);

  try {
    return runReplayOnSandbox(sandbox, corpus, start);
  } finally {
    if (!options.keepSandbox) {
      sandbox.cleanup();
    }
  }
}

export { DEFAULT_CORPUS, loadCorpus };
