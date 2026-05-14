import chalk from "chalk";
import type { DecoySummary } from "../types.js";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function printDecoyReport(summary: DecoySummary): void {
  console.log("");
  console.log(chalk.bold.cyan("  MCP Sentinel — AICON decoy report"));
  console.log(
    chalk.gray(
      `  ${summary.decoyedAt} · ${summary.decoyDurationMs}ms · corpus ${summary.corpusVersion}`
    )
  );
  console.log("");

  console.log(chalk.bold("  Agent"));
  console.log(`  ${summary.agentName}`);
  console.log("");

  const { score } = summary;
  console.log(chalk.bold("  Dual-path outcome"));
  console.log(
    `  Real path (hardened): ${pct(score.realExploitRateBefore)} → ${pct(score.realExploitRateAfter)} exploited (−${score.realExploitedDelta})`
  );
  console.log(
    `  Decoy path (AICON):   ${score.attacksRouted} attacks routed, ${score.detections} ghost-tool triggers (${pct(score.triggerRate)} catch rate)`
  );
  console.log(
    chalk.gray(`  Ghost tools injected: ${summary.ghostToolsInjected.length}`)
  );
  console.log("");

  if (summary.mutations.length > 0) {
    console.log(chalk.bold(`  Real-path hardening (${summary.mutations.length})`));
    for (const m of summary.mutations.filter((x) => x.kind !== "recommendation").slice(0, 6)) {
      console.log(`  ${chalk.yellow(m.field)}: ${String(m.before)} → ${String(m.after)}`);
    }
    const recs = summary.mutations.filter((m) => m.kind === "recommendation");
    if (recs.length > 0) {
      console.log(chalk.gray(`  + ${recs.length} config recommendation(s)`));
    }
    console.log("");
  }

  if (summary.detections.length > 0) {
    console.log(chalk.bold(`  Decoy detections (${summary.detections.length})`));
    for (const d of summary.detections.slice(0, 10)) {
      console.log(
        `  ${chalk.magenta("TRIGGER")} ${d.ghostTool} ← ${d.attackName} (${d.attackId})`
      );
      console.log(chalk.gray(`  ${d.evidence}`));
    }
    if (summary.detections.length > 10) {
      console.log(chalk.gray(`  … +${summary.detections.length - 10} more`));
    }
    console.log("");
  } else {
    console.log(chalk.green("  No decoy triggers — real path already blocked attacks."));
    console.log("");
  }

  const stillExploited = summary.after.results.filter((r) => r.outcome === "exploited");
  if (stillExploited.length > 0) {
    console.log(chalk.bold("  Still exploited on real path (config fixes needed)"));
    for (const r of stillExploited.slice(0, 5)) {
      const decoyCaught = summary.detections.some((d) => d.attackId === r.attackId);
      const tag = decoyCaught ? chalk.magenta("decoy caught") : chalk.red("exposed");
      console.log(`  ${tag} ${r.attackName} (${r.attackId})`);
    }
    console.log("");
  }
}

export function exitCodeForDecoy(summary: DecoySummary): number {
  if (summary.score.realExploitRateAfter === 0 && summary.score.triggerRate >= 0.9) return 0;
  if (summary.score.realExploitRateAfter >= summary.score.realExploitRateBefore) return 2;
  return 1;
}
