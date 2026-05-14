import type { AttackCategory, OwaspCategory, ReplaySummary } from "../replay/types.js";
import type { Mutation, MutationScore } from "../mutation/types.js";

export type DecoyToolKind = "get" | "set" | "execute";

export interface GhostTool {
  name: string;
  description: string;
  kind: DecoyToolKind;
  category: AttackCategory;
  owasp: OwaspCategory;
  /** Attack categories this ghost tool absorbs when routing */
  routesCategories: AttackCategory[];
}

export interface GhostToolCatalog {
  version: string;
  tools: GhostTool[];
}

export interface DecoyDetection {
  attackId: string;
  attackName: string;
  attackCategory: AttackCategory;
  ghostTool: string;
  ghostKind: DecoyToolKind;
  owasp: OwaspCategory;
  routed: boolean;
  /** Simulated tool-call args the attacker would have sent */
  simulatedArgs: Record<string, string>;
  evidence: string;
}

export interface DecoyRoutingScore {
  attacksRouted: number;
  detections: number;
  triggerRate: number;
  realExploitRateBefore: number;
  realExploitRateAfter: number;
  realExploitedDelta: number;
}

export interface DecoySummary {
  agentName: string;
  realSandboxPath: string;
  decoySandboxPath: string;
  corpusVersion: string;
  ghostToolsInjected: GhostTool[];
  detections: DecoyDetection[];
  mutations: Mutation[];
  score: DecoyRoutingScore;
  before: ReplaySummary;
  after: ReplaySummary;
  decoyedAt: string;
  decoyDurationMs: number;
}

export interface DecoyOptions {
  corpusPath?: string;
  keepSandbox?: boolean;
  catalogPath?: string;
  writeBack?: boolean;
}
