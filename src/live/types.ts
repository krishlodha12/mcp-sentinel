import type { ScanSummary } from "../scanner/types.js";

export type ProbeTransport = "stdio" | "remote";

export type ProbeStatus = "connected" | "skipped" | "failed";

export interface LiveToolInfo {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface LivePromptInfo {
  name: string;
  description?: string;
}

export interface LiveResourceInfo {
  name: string;
  uri?: string;
  description?: string;
}

export interface ServerProbeResult {
  serverName: string;
  transport: ProbeTransport;
  status: ProbeStatus;
  packageId?: string;
  commandLine?: string;
  remoteUrl?: string;
  durationMs: number;
  tools: LiveToolInfo[];
  prompts: LivePromptInfo[];
  resources: LiveResourceInfo[];
  drift: {
    onlyInConfig: string[];
    onlyLive: string[];
  };
  error?: string;
  skipReason?: string;
}

export interface ProbeSummary {
  configPath: string;
  staticScan: ScanSummary;
  liveScan?: ScanSummary;
  servers: ServerProbeResult[];
  probedAt: string;
  probeDurationMs: number;
  legalNotice: string;
}

export interface ProbeOptions {
  /** Only spawn local stdio servers (default true). */
  stdioOnly?: boolean;
  /** Allow remote URL transports (default false — you must own the endpoint). */
  allowRemote?: boolean;
  /** Allow packages outside the official @modelcontextprotocol/* allowlist. */
  allowAnyPackage?: boolean;
  /** Per-server connect timeout in ms (default 45000). */
  timeoutMs?: number;
  /** Replace missing filesystem path args with a temp sandbox dir. */
  sandboxPaths?: boolean;
}
