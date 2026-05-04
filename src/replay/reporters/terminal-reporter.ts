import chalk from "chalk";
import type { ReplayOutcome, ReplaySummary } from "../types.js";
import { printReport } from "../../reports/terminal-reporter.js";

const OUTCOME_COLOR: Record<ReplayOutcome, (s: string) => string> = {
  blocked: chalk.green.bold,
  exploited: chalk.red.bold,
};

export function printReplayReport(summary: ReplaySummary): void {
  console.log("");
  console.log(chalk.bold.cyan("  MCP Sentinel — replay report"));
  console.log(
    chalk.gray(
      `  ${summary.replayedAt} · ${summary.replayDurationMs}ms · corpus ${summary.corpusVersion}`
    )
  );
  console.log("");

  console.log(chalk.bold("  Agent"));
  console.log(`  ${summary.agentName}`);
  console.log("");

  console.log(chalk.bold("  Attack replay"));
  const rate =
    summary.attacksRun > 0
      ? Math.round((summary.exploited / summary.attacksRun) * 100)
      : 0;
  console.log(
    `  Attacks: ${summary.attacksRun}  ·  ${OUTCOME_COLOR.exploited("EXPLOITED")} ${summary.exploited}  ·  ${OUTCOME_COLOR.blocked("BLOCKED")} ${summary.blocked}  ·  exploit rate ${rate}%`
  );
  console.log("");

  if (Object.keys(summary.byCategory).length > 0) {
    console.log(chalk.bold("  By category"));
    for (const [cat, counts] of Object.entries(summary.byCategory)) {
      if (!counts) continue;
      console.log(
        `  ${cat}: exploited ${counts.exploited}, blocked ${counts.blocked}`
      );
    }
    console.log("");
  }

  console.log(chalk.bold("  Static scan (Phase 1)"));
  console.log(
    chalk.gray(
      `  ${summary.staticScan.findings.length} findings · ${summary.staticScan.scanDurationMs}ms`
    )
  );
  console.log("");

  console.log(chalk.bold("  Replay results"));
  console.log("");
  for (const r of summary.results) {
    const badge = OUTCOME_COLOR[r.outcome](` ${r.outcome.toUpperCase()} `);
    console.log(`  ${badge} ${chalk.bold(r.attackName)} (${r.attackId})`);
    console.log(chalk.gray(`  ${r.category} · ${r.turns} turn(s) · OWASP ${r.owasp}`));
    for (const e of r.evidence.slice(0, 3)) {
      console.log(chalk.gray(`  · ${e.message}`));
    }
    if (r.evidence.length > 3) {
      console.log(chalk.gray(`  · … +${r.evidence.length - 3} more`));
    }
    console.log("");
  }

  if (summary.staticScan.findings.length > 0) {
    console.log(chalk.bold("  Static findings (reference)"));
    printReport(summary.staticScan);
  }
}

export function exitCodeForReplay(summary: ReplaySummary): number {
  if (summary.exploited === 0) return 0;
  if (summary.exploited > summary.blocked) return 2;
  return 1;
}
