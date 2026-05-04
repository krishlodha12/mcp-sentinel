import chalk from "chalk";
import type { MutationKind, MutationSummary } from "../types.js";

const KIND_COLOR: Record<MutationKind, (s: string) => string> = {
  policy: chalk.yellow.bold,
  "system-prompt": chalk.cyan.bold,
  recommendation: chalk.magenta.bold,
};

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function printMutationReport(summary: MutationSummary): void {
  console.log("");
  console.log(chalk.bold.cyan("  MCP Sentinel — mutation report"));
  console.log(
    chalk.gray(
      `  ${summary.mutatedAt} · ${summary.mutationDurationMs}ms · corpus ${summary.corpusVersion}`
    )
  );
  console.log("");

  console.log(chalk.bold("  Agent"));
  console.log(`  ${summary.agentName}`);
  console.log("");

  console.log(chalk.bold("  Before / after exploit rate"));
  const { score } = summary;
  const improved = score.exploitRateAfter < score.exploitRateBefore;
  const deltaColor = improved ? chalk.green : chalk.red;
  console.log(
    `  Before: ${pct(score.exploitRateBefore)} (${score.exploitedBefore} exploited / ${summary.before.attacksRun} attacks)`
  );
  console.log(
    `  After:  ${pct(score.exploitRateAfter)} (${score.exploitedAfter} exploited / ${summary.after.attacksRun} attacks)`
  );
  console.log(
    deltaColor(
      `  Delta:  -${score.exploitedDelta} exploited, +${score.blockedDelta} blocked`
    )
  );
  console.log("");

  console.log(chalk.bold(`  Mutations applied (${summary.mutations.length})`));
  if (summary.mutations.length === 0) {
    console.log(chalk.gray("  No agent hardening needed — replay already blocked most attacks."));
  }
  for (const m of summary.mutations) {
    const badge = KIND_COLOR[m.kind](` ${m.kind.toUpperCase()} `);
    console.log(`  ${badge} ${chalk.bold(m.field)}`);
    console.log(chalk.gray(`  ${m.reason}`));
    if (m.kind !== "recommendation") {
      console.log(chalk.gray(`  ${String(m.before)} → ${String(m.after)}`));
    }
    console.log(chalk.gray(`  Attacks: ${m.attackIds.join(", ")}`));
    console.log("");
  }

  const newlyBlocked = summary.before.results.filter((before) => {
    if (before.outcome !== "exploited") return false;
    const after = summary.after.results.find((r) => r.attackId === before.attackId);
    return after?.outcome === "blocked";
  });

  if (newlyBlocked.length > 0) {
    console.log(chalk.bold("  Newly blocked attacks"));
    for (const r of newlyBlocked) {
      console.log(`  ${chalk.green("BLOCKED")} ${r.attackName} (${r.attackId})`);
    }
    console.log("");
  }

  const stillExploited = summary.after.results.filter((r) => r.outcome === "exploited");
  if (stillExploited.length > 0) {
    console.log(chalk.bold("  Still exploited (config fixes needed)"));
    for (const r of stillExploited.slice(0, 8)) {
      console.log(`  ${chalk.red("EXPLOITED")} ${r.attackName} (${r.attackId})`);
    }
    if (stillExploited.length > 8) {
      console.log(chalk.gray(`  … +${stillExploited.length - 8} more`));
    }
    console.log("");
  }
}

export function exitCodeForMutation(summary: MutationSummary): number {
  if (summary.score.exploitRateAfter === 0) return 0;
  if (summary.score.exploitRateAfter >= summary.score.exploitRateBefore) return 2;
  return 1;
}
