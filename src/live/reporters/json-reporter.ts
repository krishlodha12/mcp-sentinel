import { writeFileSync } from "node:fs";
import type { ProbeSummary } from "../types.js";

export function writeProbeJsonReport(summary: ProbeSummary, outputPath: string): void {
  writeFileSync(outputPath, JSON.stringify(summary, null, 2), "utf-8");
}

export function writeProbeMarkdownReport(summary: ProbeSummary, outputPath: string): void {
  const lines: string[] = [
    "# MCP Sentinel — live probe report",
    "",
    `- **Config:** \`${summary.configPath}\``,
    `- **Probed at:** ${summary.probedAt}`,
    `- **Duration:** ${summary.probeDurationMs}ms`,
    "",
    "## Legal scope",
    "",
    summary.legalNotice,
    "",
    "## Static scan",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Findings | ${summary.staticScan.findings.length} |`,
    `| Critical | ${summary.staticScan.bySeverity.critical} |`,
    `| High | ${summary.staticScan.bySeverity.high} |`,
    "",
  ];

  if (summary.liveScan) {
    lines.push(
      "## Live scan",
      "",
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Findings | ${summary.liveScan.findings.length} |`,
      `| Critical | ${summary.liveScan.bySeverity.critical} |`,
      `| High | ${summary.liveScan.bySeverity.high} |`,
      ""
    );
  }

  lines.push("## Servers", "");

  for (const s of summary.servers) {
    lines.push(`### ${s.serverName} — ${s.status}`, "");
    if (s.packageId) lines.push(`- Package: \`${s.packageId}\``);
    if (s.commandLine) lines.push(`- Command: \`${s.commandLine}\``);
    if (s.skipReason) lines.push(`- Skip: ${s.skipReason}`);
    if (s.error) lines.push(`- Error: ${s.error}`);
    if (s.tools.length > 0) {
      lines.push("", "**Live tools:**", "");
      for (const t of s.tools) {
        lines.push(`- \`${t.name}\` — ${t.description || "(no description)"}`);
      }
    }
    lines.push("");
  }

  writeFileSync(outputPath, lines.join("\n"), "utf-8");
}
