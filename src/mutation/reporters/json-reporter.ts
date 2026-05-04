import { writeFileSync } from "node:fs";
import type { MutationSummary } from "../types.js";

export function writeMutationJsonReport(summary: MutationSummary, path: string): void {
  writeFileSync(path, JSON.stringify(summary, null, 2), "utf-8");
}

export function mutationSummaryToMarkdown(summary: MutationSummary): string {
  const { score } = summary;
  const lines: string[] = [
    "# MCP Sentinel Mutation Report",
    "",
    `**Agent:** ${summary.agentName}`,
    `**Mutated:** ${summary.mutatedAt}`,
    `**Duration:** ${summary.mutationDurationMs}ms`,
    `**Corpus:** ${summary.corpusVersion}`,
    "",
    "## Before / after",
    "",
    "| Metric | Before | After |",
    "|--------|-------:|------:|",
    `| Exploit rate | ${Math.round(score.exploitRateBefore * 100)}% | ${Math.round(score.exploitRateAfter * 100)}% |`,
    `| Exploited | ${score.exploitedBefore} | ${score.exploitedAfter} |`,
    `| Blocked | ${score.blockedBefore} | ${score.blockedAfter} |`,
    "",
    "## Mutations",
    "",
  ];

  if (summary.mutations.length === 0) {
    lines.push("_No agent hardening applied._", "");
  }

  for (const m of summary.mutations) {
    lines.push(`### ${m.kind}: ${m.field}`, "");
    lines.push(`- **Reason:** ${m.reason}`);
    if (m.kind !== "recommendation") {
      lines.push(`- **Before:** \`${String(m.before)}\``);
      lines.push(`- **After:** \`${String(m.after)}\``);
    }
    lines.push(`- **Attacks:** ${m.attackIds.join(", ")}`);
    lines.push("");
  }

  const newlyBlocked = summary.before.results.filter((before) => {
    if (before.outcome !== "exploited") return false;
    const after = summary.after.results.find((r) => r.attackId === before.attackId);
    return after?.outcome === "blocked";
  });

  if (newlyBlocked.length > 0) {
    lines.push("## Newly blocked", "");
    for (const r of newlyBlocked) {
      lines.push(`- ${r.attackName} (\`${r.attackId}\`)`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function writeMutationMarkdownReport(
  summary: MutationSummary,
  path: string
): void {
  writeFileSync(path, mutationSummaryToMarkdown(summary), "utf-8");
}
