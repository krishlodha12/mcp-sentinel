import type { OwaspCategory, ScanSummary, ScanTarget, Severity } from "../scanner/types.js";

export type { OwaspCategory } from "../scanner/types.js";

export type AttackCategory =
  | "injection"
  | "jailbreak"
  | "exfiltration"
  | "privilege-escalation"
  | "multi-turn";

export type ReplayOutcome = "blocked" | "exploited";

export interface AgentPolicies {
  followHiddenToolInstructions: boolean;
  allowShellExecution: boolean;
  trustRemoteTools: boolean;
  maxAllowedPathScope: "global" | "scoped";
}

export interface AgentConfig {
  name: string;
  description?: string;
  systemPrompt: string;
  policies: AgentPolicies;
  /** MCP config paths relative to the agent fixture directory */
  mcpPaths: string[];
}

export interface ExploitCondition {
  type:
    | "scan-finding"
    | "agent-policy"
    | "tool-present"
    | "tool-description-contains"
    | "prompt-description-contains"
    | "resource-description-contains"
    | "attack-turn-matches"
    | "system-prompt-weak"
    | "remote-http"
    | "all"
    | "any";
  checkId?: string;
  minSeverity?: Severity;
  policy?: keyof AgentPolicies;
  value?: boolean | string;
  tool?: string;
  name?: string;
  pattern?: string;
  flags?: string;
  conditions?: ExploitCondition[];
}

export interface ReplayAttack {
  id: string;
  name: string;
  category: AttackCategory;
  description: string;
  turns: string[];
  owasp: OwaspCategory;
  exploitWhen: ExploitCondition[];
}

export interface AttackCorpus {
  version: string;
  attacks: ReplayAttack[];
}

export interface ReplayEvidence {
  kind: "policy" | "finding" | "tool" | "prompt" | "resource" | "attack" | "transport";
  message: string;
  location?: string;
}

export interface ReplayResult {
  attackId: string;
  attackName: string;
  category: AttackCategory;
  owasp: OwaspCategory;
  outcome: ReplayOutcome;
  turns: number;
  evidence: ReplayEvidence[];
}

export interface ReplaySummary {
  agentName: string;
  sandboxPath: string;
  corpusVersion: string;
  attacksRun: number;
  blocked: number;
  exploited: number;
  byCategory: Partial<Record<AttackCategory, { blocked: number; exploited: number }>>;
  byOwasp: Partial<Record<OwaspCategory, number>>;
  results: ReplayResult[];
  staticScan: ScanSummary;
  liveProbe?: LiveProbeReplay;
  replayedAt: string;
  replayDurationMs: number;
}

import type { ProbeOptions, ServerProbeResult } from "../live/types.js";

export interface ReplayOptions {
  corpusPath?: string;
  keepSandbox?: boolean;
  /** Spawn local MCP servers and merge runtime tools into replay targets. */
  live?: boolean;
  liveProbeOptions?: ProbeOptions;
}

export interface LiveProbeReplay {
  enabled: boolean;
  servers: ServerProbeResult[];
  liveToolsMerged: number;
  probeDurationMs: number;
}

export interface SandboxSession {
  path: string;
  agent: AgentConfig;
  targets: ScanTarget[];
  staticScan: ScanSummary;
  cleanup: () => void;
}
