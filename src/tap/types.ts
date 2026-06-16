import type { AttackCategory, OwaspCategory } from "../replay/types.js";
import type { Severity } from "../scanner/types.js";

export type TapDirection = "client" | "server";

export interface TapMetaEvent {
  type: "meta";
  sessionId: string;
  startedAt: string;
  command: string;
  args: string[];
  pid?: number;
}

export interface TapMessageEvent {
  type: "message";
  ts: string;
  direction: TapDirection;
  method?: string;
  id?: string | number | null;
  payload: Record<string, unknown>;
}

export type TapLogEvent = TapMetaEvent | TapMessageEvent;

export interface TapOptions {
  logPath: string;
  sessionId?: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ParsedToolCall {
  index: number;
  ts: string;
  requestId?: string | number | null;
  tool: string;
  args: unknown;
  response?: unknown;
  responseTs?: string;
}

export interface ToolListSnapshot {
  ts: string;
  tools: Array<{ name: string; description: string }>;
}

export interface ParsedSession {
  sessionId: string;
  startedAt: string;
  command: string;
  args: string[];
  events: TapMessageEvent[];
  toolCalls: ParsedToolCall[];
  toolListSnapshots: ToolListSnapshot[];
}

export type RuntimeMatchType =
  | "tool-call-args-pattern"
  | "tool-call-burst"
  | "tool-response-pattern"
  | "tool-list-drift"
  | "sensitive-path-access";

export interface RuntimeSignalMatch {
  type: RuntimeMatchType;
  toolPattern?: string;
  pattern?: string;
  flags?: string;
  minCalls?: number;
  windowMs?: number;
  paths?: string[];
}

export interface RuntimeSignal {
  id: string;
  name: string;
  description: string;
  attackId?: string;
  category: AttackCategory;
  owasp: OwaspCategory;
  severity: Severity;
  match: RuntimeSignalMatch;
}

export interface RuntimeSignalsCatalog {
  version: string;
  signals: RuntimeSignal[];
}

export interface RuntimeMatchEvidence {
  kind: "tool-call" | "response" | "burst" | "drift" | "path";
  message: string;
  tool?: string;
  ts?: string;
  callIndex?: number;
}

export interface RuntimeMatchResult {
  signalId: string;
  signalName: string;
  attackId?: string;
  attackName?: string;
  category: AttackCategory;
  owasp: OwaspCategory;
  severity: Severity;
  evidence: RuntimeMatchEvidence[];
}

export interface ForensicsSummary {
  sessionId: string;
  sessionPath: string;
  startedAt: string;
  command: string;
  toolCallCount: number;
  eventCount: number;
  corpusVersion: string;
  signalsVersion: string;
  matches: RuntimeMatchResult[];
  bySeverity: Partial<Record<Severity, number>>;
  byOwasp: Partial<Record<OwaspCategory, number>>;
  analyzedAt: string;
  analyzeDurationMs: number;
}

export interface ForensicsOptions {
  corpusPath?: string;
  signalsPath?: string;
}
