import { writeFileSync } from "node:fs";
import type { TwinSummary } from "../types.js";

export function writeTwinJsonReport(summary: TwinSummary, path: string): void {
  writeFileSync(path, JSON.stringify(summary, null, 2), "utf-8");
}

export function twinSummaryToMarkdown(summary: TwinSummary): string {
  const { score } = summary;
  const lines: string[] = [
    "# MCP Sentinel Closed-Loop Attack Twin Report",
    "",
    `**Fleet:** ${summary.fleetName}`,
    `**Twinned:** ${summary.twinnedAt}`,
    `**Duration:** ${summary.twinDurationMs}ms`,
    `**Corpus:** ${summary.corpusVersion}`,
    "",
    "## Closed-loop outcome",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    `| Fleet exploit rate before | ${Math.round(score.fleetExploitRateBefore * 100)}% |`,
    `| Fleet exploit rate after | ${Math.round(score.fleetExploitRateAfter * 100)}% |`,
    `| Fleet exploits eliminated | ${score.fleetExploitedDelta} |`,
    `| Intel entries | ${score.intelEntries} |`,
    `| Watchlist size | ${score.watchlistSize} |`,
    `| Decoy triggers | ${score.decoyDetections} |`,
    `| Decoy catch rate | ${Math.round(score.decoyCatchRate * 100)}% |`,
    "",
    "## Per-agent scores",
    "",
    "| Agent | Role | Before | After | Intel in/out | Mutations |",
    "|-------|------|-------:|------:|-------------:|----------:|",
  ];

  for (const a of score.agents) {
    lines.push(
      `| ${a.agentId} | ${a.role} | ${Math.round(a.exploitRateBefore * 100)}% | ${Math.round(a.exploitRateAfter * 100)}% | ${a.intelReceived}/${a.intelContributed} | ${a.mutationsApplied} |`
    );
  }
  lines.push("");

  if (summary.ledger.watchlist.length > 0) {
    lines.push("## Fleet watchlist", "");
    for (const id of summary.ledger.watchlist) {
      lines.push(`- \`${id}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function writeTwinMarkdownReport(summary: TwinSummary, path: string): void {
  writeFileSync(path, twinSummaryToMarkdown(summary), "utf-8");
}
