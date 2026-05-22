import type { AttackCategory, OwaspCategory, ReplayEvidence, ReplaySummary } from "../replay/types.js";
import type { DecoyDetection } from "../decoy/types.js";
import type { Mutation } from "../mutation/types.js";

export type FleetAgentRole = "probe" | "worker" | "gateway" | "observer";

export interface FleetAgentRef {
  id: string;
  path: string;
  role: FleetAgentRole;
}

export interface FleetConfig {
  name: string;
  description?: string;
  agents: FleetAgentRef[];
}

export interface IntelEntry {
  attackId: string;
  attackName: string;
  category: AttackCategory;
  owasp: OwaspCategory;
  sourceAgentId: string;
  sourceAgentName: string;
  outcome: "exploited" | "blocked";
  turns: number;
  evidence: ReplayEvidence[];
  sharedAtRound: number;
}

export interface IntelLedger {
  version: string;
  fleetName: string;
  entries: IntelEntry[];
  /** Unique attack IDs exploited anywhere in the fleet */
  watchlist: string[];
  roundsPublished: number;
}

export interface TwinAgentScore {
  agentId: string;
  agentName: string;
  role: FleetAgentRole;
  exploitRateBefore: number;
  exploitRateAfter: number;
  exploitedBefore: number;
  exploitedAfter: number;
  exploitedDelta: number;
  mutationsApplied: number;
  intelReceived: number;
  intelContributed: number;
}

export interface TwinLoopScore {
  agents: TwinAgentScore[];
  fleetExploitRateBefore: number;
  fleetExploitRateAfter: number;
  fleetExploitedDelta: number;
  intelEntries: number;
  watchlistSize: number;
  decoyDetections: number;
  decoyCatchRate: number;
  loopRounds: number;
}

export interface TwinAgentPass {
  agentId: string;
  agentName: string;
  role: FleetAgentRole;
  before: ReplaySummary;
  after: ReplaySummary;
  mutations: Mutation[];
  intelReceived: IntelEntry[];
  intelContributed: IntelEntry[];
}

export interface TwinSummary {
  fleetName: string;
  fleetPath: string;
  corpusVersion: string;
  ledger: IntelLedger;
  agents: TwinAgentPass[];
  decoyDetections: DecoyDetection[];
  score: TwinLoopScore;
  twinnedAt: string;
  twinDurationMs: number;
}

export interface TwinOptions {
  corpusPath?: string;
  catalogPath?: string;
  keepSandbox?: boolean;
  writeBack?: boolean;
  /** Max closed-loop iterations (probe → share → harden → verify). Default 1. */
  maxRounds?: number;
}
