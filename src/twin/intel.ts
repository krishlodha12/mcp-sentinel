import type { AttackCorpus, ReplayResult } from "../replay/types.js";
import type { IntelEntry, IntelLedger } from "./types.js";

export function createLedger(fleetName: string, corpusVersion: string): IntelLedger {
  return {
    version: corpusVersion,
    fleetName,
    entries: [],
    watchlist: [],
    roundsPublished: 0,
  };
}

export function publishProbeIntel(
  ledger: IntelLedger,
  agentId: string,
  agentName: string,
  results: ReplayResult[],
  round: number
): IntelEntry[] {
  const published: IntelEntry[] = [];

  for (const result of results) {
    const entry: IntelEntry = {
      attackId: result.attackId,
      attackName: result.attackName,
      category: result.category,
      owasp: result.owasp,
      sourceAgentId: agentId,
      sourceAgentName: agentName,
      outcome: result.outcome,
      turns: result.turns,
      evidence: result.evidence,
      sharedAtRound: round,
    };
    ledger.entries.push(entry);
    published.push(entry);

    if (result.outcome === "exploited" && !ledger.watchlist.includes(result.attackId)) {
      ledger.watchlist.push(result.attackId);
    }
  }

  ledger.roundsPublished = round;
  return published;
}

/** Merge local exploited results with sibling exploit intel for cross-agent hardening. */
export function mergeExploitEvidence(
  localResults: ReplayResult[],
  ledger: IntelLedger,
  selfAgentId: string
): ReplayResult[] {
  const localExploited = new Map(
    localResults.filter((r) => r.outcome === "exploited").map((r) => [r.attackId, r])
  );
  const merged: ReplayResult[] = [...localResults.filter((r) => r.outcome === "exploited")];

  for (const entry of ledger.entries) {
    if (entry.sourceAgentId === selfAgentId) continue;
    if (entry.outcome !== "exploited") continue;
    if (localExploited.has(entry.attackId)) continue;

    merged.push({
      attackId: entry.attackId,
      attackName: entry.attackName,
      category: entry.category,
      owasp: entry.owasp,
      outcome: "exploited",
      turns: entry.turns,
      evidence: [
        ...entry.evidence,
        {
          kind: "attack",
          message: `Fleet intel from ${entry.sourceAgentName} (${entry.sourceAgentId})`,
        },
      ],
    });
  }

  return merged;
}

export function intelReceivedBy(
  ledger: IntelLedger,
  agentId: string,
  round: number
): IntelEntry[] {
  return ledger.entries.filter(
    (e) => e.sourceAgentId !== agentId && e.sharedAtRound === round
  );
}

export function exploitedResultsFromFleet(
  ledger: IntelLedger,
  corpus: AttackCorpus
): ReplayResult[] {
  const attackMap = new Map(corpus.attacks.map((a) => [a.id, a]));
  const seen = new Set<string>();
  const results: ReplayResult[] = [];

  for (const entry of ledger.entries) {
    if (entry.outcome !== "exploited" || seen.has(entry.attackId)) continue;
    seen.add(entry.attackId);
    const attack = attackMap.get(entry.attackId);
    results.push({
      attackId: entry.attackId,
      attackName: entry.attackName,
      category: entry.category,
      owasp: attack?.owasp ?? entry.owasp,
      outcome: "exploited",
      turns: entry.turns,
      evidence: entry.evidence,
    });
  }

  return results;
}
