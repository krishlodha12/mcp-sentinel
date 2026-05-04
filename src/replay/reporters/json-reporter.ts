import { writeFileSync } from "node:fs";
import type { ReplaySummary } from "../types.js";

export function writeReplayJsonReport(summary: ReplaySummary, path: string): void {
  writeFileSync(path, JSON.stringify(summary, null, 2), "utf-8");
}

export function replaySummaryToMarkdown(summary: ReplaySummary): string {
  const lines: string[] = [
    "# MCP Sentinel Replay Report",
    "",
    `**Agent:** ${summary.agentName}`,
    `**Replayed:** ${summary.replayedAt}`,
    `**Duration:** ${summary.replayDurationMs}ms`,
    `**Corpus:** ${summary.corpusVersion}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Attacks run | ${summary.attacksRun} |`,
    `| Exploited | ${summary.exploited} |`,
    `| Blocked | ${summary.blocked} |`,
    "",
    "## Static scan",
    "",
    `Findings: ${summary.staticScan.findings.length}`,
    "",
    "## Results",
    "",
  ];

  for (const r of summary.results) {
    lines.push(`### ${r.attackName} — ${r.outcome}`, "");
    lines.push(`- **ID:** ${r.attackId}`);
    lines.push(`- **Category:** ${r.category}`);
    lines.push(`- **OWASP:** ${r.owasp}`);
    for (const e of r.evidence) {
      lines.push(`- ${e.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function writeReplayMarkdownReport(
  summary: ReplaySummary,
  path: string
): void {
  writeFileSync(path, replaySummaryToMarkdown(summary), "utf-8");
}
