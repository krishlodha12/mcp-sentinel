import chalk from "chalk";
import type { TwinSummary } from "../types.js";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function printTwinReport(summary: TwinSummary): void {
  console.log("");
  console.log(chalk.bold.cyan("  MCP Sentinel — closed-loop attack twin report"));
  console.log(
    chalk.gray(
      `  ${summary.twinnedAt} · ${summary.twinDurationMs}ms · corpus ${summary.corpusVersion}`
    )
  );
  console.log("");

  console.log(chalk.bold("  Fleet"));
  console.log(`  ${summary.fleetName}`);
  console.log(`  ${summary.agents.length} agents · ${summary.score.intelEntries} intel entries`);
  console.log("");

  const { score } = summary;
  console.log(chalk.bold("  Closed-loop outcome"));
  console.log(
    `  Fleet exploit rate: ${pct(score.fleetExploitRateBefore)} → ${pct(score.fleetExploitRateAfter)} (−${score.fleetExploitedDelta} exploits)`
  );
  console.log(
    `  Intel watchlist: ${score.watchlistSize} attack IDs · decoy catch ${pct(score.decoyCatchRate)} (${score.decoyDetections} triggers)`
  );
  console.log("");

  console.log(chalk.bold("  Per-agent"));
  for (const a of score.agents) {
    console.log(
      `  ${chalk.yellow(a.agentId)} (${a.role}): ${pct(a.exploitRateBefore)} → ${pct(a.exploitRateAfter)} · intel +${a.intelContributed}/−${a.intelReceived} · ${a.mutationsApplied} mutation(s)`
    );
  }
  console.log("");

  if (summary.ledger.watchlist.length > 0) {
    console.log(chalk.bold(`  Fleet watchlist (${summary.ledger.watchlist.length})`));
    console.log(
      chalk.gray(`  ${summary.ledger.watchlist.slice(0, 12).join(", ")}${summary.ledger.watchlist.length > 12 ? " …" : ""}`)
    );
    console.log("");
  }

  if (summary.decoyDetections.length > 0) {
    console.log(chalk.bold(`  Fleet decoy routing (${summary.decoyDetections.length})`));
    for (const d of summary.decoyDetections.slice(0, 8)) {
      console.log(
        `  ${chalk.magenta("TRIGGER")} ${d.ghostTool} ← ${d.attackName}`
      );
    }
    if (summary.decoyDetections.length > 8) {
      console.log(chalk.gray(`  … +${summary.decoyDetections.length - 8} more`));
    }
    console.log("");
  }
}

export function exitCodeForTwin(summary: TwinSummary): number {
  if (scoreImproved(summary) && summary.score.decoyCatchRate >= 0.9) return 0;
  if (summary.score.fleetExploitRateAfter >= summary.score.fleetExploitRateBefore) return 2;
  return 1;
}

function scoreImproved(summary: TwinSummary): boolean {
  return summary.score.fleetExploitRateAfter < summary.score.fleetExploitRateBefore;
}
