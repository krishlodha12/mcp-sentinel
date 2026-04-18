export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type OwaspCategory =
  | "ASI01"
  | "ASI02"
  | "ASI03"
  | "ASI04"
  | "ASI05"
  | "ASI06"
  | "ASI07"
  | "ASI08"
  | "ASI09"
  | "ASI10";

export interface OwaspRef {
  id: OwaspCategory;
  name: string;
  url: string;
}

export interface ScanTarget {
  serverName: string;
  sourceFile: string;
  sourceKind: "mcp-config" | "server-json" | "tools-manifest";
  tools: ToolDefinition[];
  prompts: PromptDefinition[];
  resources: ResourceDefinition[];
  packages: PackageDefinition[];
  rawEnv: Record<string, string>;
  commandLine?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  sourcePath: string;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: unknown[];
  sourcePath: string;
}

export interface ResourceDefinition {
  name: string;
  description: string;
  uri?: string;
  mimeType?: string;
  sourcePath: string;
}

export interface PackageDefinition {
  registryType: string;
  identifier: string;
  version?: string;
  transport?: { type: string };
  sourcePath: string;
}

export interface Finding {
  id: string;
  checkId: string;
  title: string;
  severity: Severity;
  owasp: OwaspRef;
  serverName: string;
  location: string;
  snippet?: string;
  message: string;
  remediation: string;
  explanation: string;
  references: string[];
  cwe?: string;
  cve?: string;
}

export interface ScanSummary {
  serversScanned: number;
  toolsChecked: number;
  promptsChecked: number;
  resourcesChecked: number;
  findings: Finding[];
  bySeverity: Record<Severity, number>;
  byOwasp: Partial<Record<OwaspCategory, number>>;
  scannedAt: string;
  scanDurationMs: number;
}

export interface ScanOptions {
  includeInfo?: boolean;
  minSeverity?: Severity;
}

export interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  run(target: ScanTarget): Finding[];
}

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

export function meetsMinSeverity(
  finding: Severity,
  min: Severity | undefined
): boolean {
  if (!min) return true;
  return severityRank(finding) <= severityRank(min);
}
