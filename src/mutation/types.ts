import type { AgentConfig, AgentPolicies, ReplaySummary } from "../replay/types.js";

export type MutationKind = "policy" | "system-prompt" | "recommendation";

export interface Mutation {
  kind: MutationKind;
  field: string;
  before: string | boolean;
  after: string | boolean;
  reason: string;
  attackIds: string[];
}

export interface MutationScore {
  exploitRateBefore: number;
  exploitRateAfter: number;
  exploitedBefore: number;
  exploitedAfter: number;
  blockedBefore: number;
  blockedAfter: number;
  exploitedDelta: number;
  blockedDelta: number;
}

export interface MutationSummary {
  agentName: string;
  sandboxPath: string;
  corpusVersion: string;
  before: ReplaySummary;
  after: ReplaySummary;
  mutations: Mutation[];
  score: MutationScore;
  mutatedAt: string;
  mutationDurationMs: number;
}

export interface MutationOptions {
  corpusPath?: string;
  keepSandbox?: boolean;
  /** Write hardened agent.json back to the fixture directory */
  writeBack?: boolean;
}

export interface PlannedMutation {
  kind: MutationKind;
  field: string;
  before: string | boolean;
  after: string | boolean;
  reason: string;
  attackIds: string[];
}

export type { AgentConfig, AgentPolicies };
