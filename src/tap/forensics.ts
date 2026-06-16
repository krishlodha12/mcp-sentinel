import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AttackCorpus } from "../replay/types.js";
import type { ForensicsOptions, ForensicsSummary } from "./types.js";
import type { Severity } from "../scanner/types.js";
import type { OwaspCategory } from "../replay/types.js";
import { parseSessionLog } from "./session.js";
import { loadRuntimeSignals, matchSessionSignals } from "./signals.js";

const DEFAULT_CORPUS = join(
  dirname(fileURLToPath(import.meta.url)),
  "../replay/corpus/attacks.json"
);

function loadCorpus(path?: string): AttackCorpus {
  const corpusPath = path ?? DEFAULT_CORPUS;
  const raw = JSON.parse(readFileSync(corpusPath, "utf-8")) as AttackCorpus;
  if (!raw.attacks?.length) {
    throw new Error(`Attack corpus empty or invalid: ${corpusPath}`);
  }
  return raw;
}

export function runForensics(
  sessionPath: string,
  options: ForensicsOptions = {}
): ForensicsSummary {
  const start = Date.now();
  const session = parseSessionLog(sessionPath);
  const corpus = loadCorpus(options.corpusPath);
  const catalog = loadRuntimeSignals(options.signalsPath);
  const matches = matchSessionSignals(session, catalog, corpus);

  const bySeverity: Partial<Record<Severity, number>> = {};
  const byOwasp: Partial<Record<OwaspCategory, number>> = {};

  for (const m of matches) {
    bySeverity[m.severity] = (bySeverity[m.severity] ?? 0) + 1;
    byOwasp[m.owasp] = (byOwasp[m.owasp] ?? 0) + 1;
  }

  return {
    sessionId: session.sessionId,
    sessionPath,
    startedAt: session.startedAt,
    command: [session.command, ...session.args].join(" "),
    toolCallCount: session.toolCalls.length,
    eventCount: session.events.length,
    corpusVersion: corpus.version,
    signalsVersion: catalog.version,
    matches,
    bySeverity,
    byOwasp,
    analyzedAt: new Date().toISOString(),
    analyzeDurationMs: Date.now() - start,
  };
}

export function exitCodeForForensics(summary: ForensicsSummary): number {
  const critical = summary.bySeverity.critical ?? 0;
  const high = summary.bySeverity.high ?? 0;
  if (critical > 0) return 2;
  if (high > 0) return 1;
  return 0;
}
