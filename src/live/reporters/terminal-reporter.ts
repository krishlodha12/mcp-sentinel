import chalk from "chalk";
import type { ProbeSummary, ServerProbeResult } from "../types.js";

function statusBadge(status: ServerProbeResult["status"]): string {
  switch (status) {
    case "connected":
      return chalk.bgGreen.black.bold(" CONNECTED ");
    case "skipped":
      return chalk.bgYellow.black.bold(" SKIPPED   ");
    case "failed":
      return chalk.bgRed.white.bold(" FAILED    ");
  }
}

export function printProbeReport(summary: ProbeSummary): void {
  console.log("");
  console.log(chalk.bold.cyan("  MCP Sentinel — live probe report"));
  console.log(chalk.gray(`  ${summary.probedAt} · ${summary.probeDurationMs}ms`));
  console.log(chalk.gray(`  ${summary.configPath}`));
  console.log("");

  console.log(chalk.bold("  Legal scope"));
  console.log(chalk.gray(`  ${summary.legalNotice}`));
  console.log("");

  const connected = summary.servers.filter((s) => s.status === "connected").length;
  const failed = summary.servers.filter((s) => s.status === "failed").length;
  const skipped = summary.servers.filter((s) => s.status === "skipped").length;
  const liveTools = summary.servers.reduce((n, s) => n + s.tools.length, 0);

  console.log(chalk.bold("  Summary"));
  console.log(
    `  Servers: ${summary.servers.length}  ·  Connected: ${connected}  ·  Failed: ${failed}  ·  Skipped: ${skipped}  ·  Live tools: ${liveTools}`
  );
  console.log("");

  console.log(chalk.bold("  Static scan (config on disk)"));
  console.log(
    `  Findings: ${summary.staticScan.findings.length}  ·  Critical: ${summary.staticScan.bySeverity.critical}  ·  High: ${summary.staticScan.bySeverity.high}`
  );
  console.log("");

  if (summary.liveScan) {
    console.log(chalk.bold("  Live scan (runtime tool surface)"));
    console.log(
      `  Findings: ${summary.liveScan.findings.length}  ·  Critical: ${summary.liveScan.bySeverity.critical}  ·  High: ${summary.liveScan.bySeverity.high}`
    );
    console.log("");
  }

  console.log(chalk.bold("  Server results"));
  console.log("");

  for (const server of summary.servers) {
    printServer(server);
  }
}

function printServer(server: ServerProbeResult): void {
  console.log(`  ${statusBadge(server.status)} ${chalk.bold(server.serverName)}`);
  if (server.packageId) console.log(chalk.gray(`  Package: ${server.packageId}`));
  if (server.commandLine) console.log(chalk.gray(`  Command: ${server.commandLine}`));
  if (server.remoteUrl) console.log(chalk.gray(`  URL: ${server.remoteUrl}`));
  if (server.durationMs > 0) console.log(chalk.gray(`  Duration: ${server.durationMs}ms`));

  if (server.skipReason) {
    console.log(chalk.yellow(`  Skip: ${server.skipReason}`));
  }
  if (server.error) {
    console.log(chalk.red(`  Error: ${server.error}`));
  }

  if (server.status === "connected") {
    console.log(
      chalk.gray(
        `  Live surface: ${server.tools.length} tools, ${server.prompts.length} prompts, ${server.resources.length} resources`
      )
    );

    if (server.tools.length > 0) {
      console.log(chalk.bold("  Tools (live):"));
      for (const tool of server.tools) {
        const desc = tool.description
          ? tool.description.slice(0, 80) + (tool.description.length > 80 ? "…" : "")
          : "(no description)";
        console.log(`    · ${chalk.cyan(tool.name)} — ${chalk.gray(desc)}`);
      }
    }

    if (server.drift.onlyLive.length > 0 || server.drift.onlyInConfig.length > 0) {
      console.log(chalk.bold("  Config drift"));
      if (server.drift.onlyLive.length > 0) {
        console.log(
          chalk.yellow(
            `    Runtime-only (not in static export): ${server.drift.onlyLive.join(", ")}`
          )
        );
      }
      if (server.drift.onlyInConfig.length > 0) {
        console.log(
          chalk.gray(`    Config-only (not seen live): ${server.drift.onlyInConfig.join(", ")}`)
        );
      }
    }
  }

  console.log("");
}

export function exitCodeForProbe(summary: ProbeSummary): number {
  if (summary.servers.some((s) => s.status === "failed")) return 2;
  if (summary.servers.every((s) => s.status === "skipped")) return 1;
  const liveFindings = summary.liveScan?.findings.length ?? 0;
  const staticCritical = summary.staticScan.bySeverity.critical;
  if (staticCritical > 0 || (summary.liveScan?.bySeverity.critical ?? 0) > 0) return 2;
  if (liveFindings > 0 || summary.staticScan.bySeverity.high > 0) return 1;
  return 0;
}
