import { writeFileSync } from "node:fs";
import type { ScanSummary } from "../scanner/types.js";
import { owaspSummary } from "../owasp/mapping.js";

export function writeJsonReport(summary: ScanSummary, path: string): void {
  writeFileSync(path, JSON.stringify(summary, null, 2), "utf-8");
}

export function summaryToMarkdown(summary: ScanSummary): string {
  const lines: string[] = [
    "# MCP Sentinel Scan Report",
    "",
    `**Scanned:** ${summary.scannedAt}`,
    `**Duration:** ${summary.scanDurationMs}ms`,
    "",
    "## Coverage",
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| MCP servers | ${summary.serversScanned} |`,
    `| Tools | ${summary.toolsChecked} |`,
    `| Prompts | ${summary.promptsChecked} |`,
    `| Resources | ${summary.resourcesChecked} |`,
    "",
    "## Severity",
    "",
    `| Severity | Count |`,
    `|----------|------:|`,
  ];

  for (const sev of ["critical", "high", "medium", "low", "info"] as const) {
    if (summary.bySeverity[sev] > 0) {
      lines.push(`| ${sev} | ${summary.bySeverity[sev]} |`);
    }
  }

  lines.push("", "## OWASP Agentic Top 10", "");
  for (const { category, count } of owaspSummary(summary.byOwasp)) {
    lines.push(`- **${category.id}** ${category.name}: ${count}`);
  }

  lines.push("", "## Findings", "");

  for (const f of summary.findings) {
    lines.push(`### ${f.title}`, "");
    lines.push(`- **Severity:** ${f.severity}`);
    lines.push(`- **Server:** ${f.serverName}`);
    lines.push(`- **Location:** ${f.location}`);
    lines.push(`- **OWASP:** ${f.owasp.id} — ${f.owasp.name}`);
    lines.push(`- **Message:** ${f.message}`);
    lines.push(`- **Remediation:** ${f.remediation}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function writeMarkdownReport(summary: ScanSummary, path: string): void {
  writeFileSync(path, summaryToMarkdown(summary), "utf-8");
}
