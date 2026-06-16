import chalk from "chalk";
import type { ForensicsSummary, RuntimeMatchResult } from "../types.js";

function severityColor(severity: string): (s: string) => string {
  switch (severity) {
    case "critical":
      return chalk.red.bold;
    case "high":
      return chalk.red;
    case "medium":
      return chalk.yellow;
    case "low":
      return chalk.blue;
    default:
      return chalk.gray;
  }
}

function printMatch(match: RuntimeMatchResult): void {
  const color = severityColor(match.severity);
  console.log(
    color(`  [${match.severity.toUpperCase()}] ${match.signalName} (${match.signalId})`)
  );
  if (match.attackId) {
    console.log(
      chalk.dim(
        `    corpus: ${match.attackId}${match.attackName ? ` — ${match.attackName}` : ""} · ${match.owasp}`
      )
    );
  }
  for (const e of match.evidence.slice(0, 3)) {
    console.log(chalk.dim(`    · ${e.message}`));
  }
  if (match.evidence.length > 3) {
    console.log(chalk.dim(`    · … +${match.evidence.length - 3} more`));
  }
}

export function printForensicsReport(summary: ForensicsSummary): void {
  console.log(chalk.bold("\nMCP Sentinel — session forensics\n"));
  console.log(`Session:   ${summary.sessionId}`);
  console.log(`Started:   ${summary.startedAt}`);
  console.log(`Command:   ${summary.command}`);
  console.log(`Events:    ${summary.eventCount} · Tool calls: ${summary.toolCallCount}`);
  console.log(
    `Corpus:    v${summary.corpusVersion} · Signals: v${summary.signalsVersion}`
  );

  if (summary.matches.length === 0) {
    console.log(chalk.green("\nNo runtime attack signals matched.\n"));
    return;
  }

  console.log(chalk.bold(`\nMatched signals (${summary.matches.length})\n`));
  for (const match of summary.matches) {
    printMatch(match);
  }

  console.log(
    chalk.bold(
      `\nSummary: ${summary.bySeverity.critical ?? 0} critical · ${summary.bySeverity.high ?? 0} high · ${summary.bySeverity.medium ?? 0} medium`
    )
  );
  console.log(chalk.dim(`Analyzed in ${summary.analyzeDurationMs}ms\n`));
}
