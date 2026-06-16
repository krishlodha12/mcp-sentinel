import { writeFileSync } from "node:fs";
import type { ForensicsSummary } from "../types.js";

export function writeForensicsJsonReport(summary: ForensicsSummary, path: string): void {
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`, "utf-8");
}

export function writeForensicsMarkdownReport(summary: ForensicsSummary, path: string): void {
  const lines: string[] = [
    "# MCP Sentinel — Session Forensics",
    "",
    `- **Session:** \`${summary.sessionId}\``,
    `- **Started:** ${summary.startedAt}`,
    `- **Command:** \`${summary.command}\``,
    `- **Events:** ${summary.eventCount} · **Tool calls:** ${summary.toolCallCount}`,
    `- **Corpus:** v${summary.corpusVersion} · **Signals:** v${summary.signalsVersion}`,
    "",
  ];

  if (summary.matches.length === 0) {
    lines.push("No runtime attack signals matched.", "");
  } else {
    lines.push("## Matched signals", "");
    for (const m of summary.matches) {
      lines.push(`### ${m.signalName} (${m.severity})`);
      lines.push("");
      lines.push(`- Signal: \`${m.signalId}\``);
      if (m.attackId) {
        lines.push(
          `- Corpus attack: \`${m.attackId}\`${m.attackName ? ` — ${m.attackName}` : ""}`
        );
      }
      lines.push(`- OWASP: ${m.owasp} · Category: ${m.category}`);
      lines.push("");
      for (const e of m.evidence) {
        lines.push(`- ${e.message}`);
      }
      lines.push("");
    }
  }

  lines.push(
    `---`,
    `*Analyzed ${summary.analyzedAt} in ${summary.analyzeDurationMs}ms*`,
    ""
  );

  writeFileSync(path, lines.join("\n"), "utf-8");
}
