import { writeFileSync } from "node:fs";
import type { DecoySummary } from "../types.js";

export function writeDecoyJsonReport(summary: DecoySummary, path: string): void {
  writeFileSync(path, JSON.stringify(summary, null, 2), "utf-8");
}

export function decoySummaryToMarkdown(summary: DecoySummary): string {
  const { score } = summary;
  const lines: string[] = [
    "# MCP Sentinel AICON Decoy Report",
    "",
    `**Agent:** ${summary.agentName}`,
    `**Decoyed:** ${summary.decoyedAt}`,
    `**Duration:** ${summary.decoyDurationMs}ms`,
    `**Corpus:** ${summary.corpusVersion}`,
    "",
    "## Dual-path outcome",
    "",
    "| Path | Metric | Value |",
    "|------|--------|------:|",
    `| Real (hardened) | Exploit rate before | ${Math.round(score.realExploitRateBefore * 100)}% |`,
    `| Real (hardened) | Exploit rate after | ${Math.round(score.realExploitRateAfter * 100)}% |`,
    `| Decoy (AICON) | Attacks routed | ${score.attacksRouted} |`,
    `| Decoy (AICON) | Ghost-tool triggers | ${score.detections} |`,
    `| Decoy (AICON) | Catch rate | ${Math.round(score.triggerRate * 100)}% |`,
    "",
    "## Ghost tools injected",
    "",
  ];

  for (const t of summary.ghostToolsInjected) {
    lines.push(`- \`${t.name}\` (${t.kind}) — routes ${t.routesCategories.join(", ")}`);
  }
  lines.push("");

  if (summary.detections.length > 0) {
    lines.push("## Decoy detections", "");
    for (const d of summary.detections) {
      lines.push(`### ${d.attackName} → \`${d.ghostTool}\``, "");
      lines.push(`- **Category:** ${d.attackCategory}`);
      lines.push(`- **OWASP:** ${d.owasp}`);
      lines.push(`- **Evidence:** ${d.evidence}`);
      lines.push("");
    }
  }

  if (summary.mutations.length > 0) {
    lines.push("## Real-path mutations", "");
    for (const m of summary.mutations) {
      lines.push(`- **${m.kind}** \`${m.field}\`: ${m.reason}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function writeDecoyMarkdownReport(summary: DecoySummary, path: string): void {
  writeFileSync(path, decoySummaryToMarkdown(summary), "utf-8");
}
