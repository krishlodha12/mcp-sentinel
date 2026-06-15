import type { ScanSummary, Finding } from "../scanner/types.js";
import type { ReplaySummary } from "../replay/types.js";
import type { ProbeSummary } from "../live/types.js";
import type { MutationSummary } from "../mutation/types.js";
import type { DecoySummary } from "../decoy/types.js";
import type { TwinSummary } from "../twin/types.js";

function compactFinding(f: Finding) {
  return {
    severity: f.severity,
    title: f.title,
    server: f.serverName,
    check: f.checkId,
    owasp: f.owasp.id,
    explanation: f.explanation,
    remediation: f.remediation,
  };
}

export function formatScanSummary(summary: ScanSummary, maxFindings = 25) {
  const findings = summary.findings.slice(0, maxFindings);
  return {
    serversScanned: summary.serversScanned,
    toolsChecked: summary.toolsChecked,
    bySeverity: summary.bySeverity,
    byOwasp: summary.byOwasp,
    findingCount: summary.findings.length,
    truncated: summary.findings.length > maxFindings,
    findings: findings.map(compactFinding),
    scannedAt: summary.scannedAt,
    scanDurationMs: summary.scanDurationMs,
  };
}

export function formatReplaySummary(summary: ReplaySummary) {
  return {
    agent: summary.agentName,
    attacksRun: summary.attacksRun,
    exploited: summary.exploited,
    blocked: summary.blocked,
    exploitRate:
      summary.attacksRun > 0 ? summary.exploited / summary.attacksRun : 0,
    staticScan: {
      findingCount: summary.staticScan.findings.length,
      critical: summary.staticScan.bySeverity.critical,
      high: summary.staticScan.bySeverity.high,
    },
    topExploits: summary.results
      .filter((r) => r.outcome === "exploited")
      .slice(0, 10)
      .map((r) => ({
        attackId: r.attackId,
        attackName: r.attackName,
        evidence: r.evidence,
      })),
  };
}

export function formatProbeSummary(summary: ProbeSummary) {
  return {
    configPath: summary.configPath,
    servers: summary.servers.map((s) => ({
      name: s.serverName,
      status: s.status,
      toolCount: s.tools.length,
      drift: s.drift,
      error: s.error,
      tools: s.tools.map((t) => t.name),
    })),
    durationMs: summary.probeDurationMs,
  };
}

export function formatMutationSummary(summary: MutationSummary) {
  return {
    agent: summary.agentName,
    mutations: summary.mutations.length,
    score: summary.score,
    recommendations: summary.mutations.slice(0, 15).map((m) => ({
      kind: m.kind,
      field: m.field,
      reason: m.reason,
    })),
  };
}

export function formatDecoySummary(summary: DecoySummary) {
  return {
    agent: summary.agentName,
    score: summary.score,
    detections: summary.detections.slice(0, 10).map((d) => ({
      attackId: d.attackId,
      ghostTool: d.ghostTool,
      routed: d.routed,
    })),
  };
}

export function formatTwinSummary(summary: TwinSummary) {
  return {
    fleet: summary.fleetName,
    agents: summary.agents.length,
    score: summary.score,
    intelEntries: summary.ledger.entries.length,
  };
}
