import chalk from "chalk";
import type { Finding, ScanSummary, Severity } from "../scanner/types.js";
import { owaspSummary } from "../owasp/mapping.js";

const SEV_COLOR: Record<Severity, (s: string) => string> = {
  critical: chalk.bgRed.white.bold,
  high: chalk.red.bold,
  medium: chalk.yellow,
  low: chalk.blue,
  info: chalk.gray,
};

function badge(sev: Severity): string {
  const label = sev.toUpperCase().padEnd(8);
  return SEV_COLOR[sev](` ${label} `);
}

export function printReport(summary: ScanSummary): void {
  console.log("");
  console.log(chalk.bold.cyan("  MCP Sentinel — scan report"));
  console.log(chalk.gray(`  ${summary.scannedAt} · ${summary.scanDurationMs}ms`));
  console.log("");

  console.log(chalk.bold("  Summary"));
  console.log(
    `  Servers: ${summary.serversScanned}  ·  Tools: ${summary.toolsChecked}  ·  Prompts: ${summary.promptsChecked}  ·  Resources: ${summary.resourcesChecked}`
  );
  console.log("");

  const sevLine = (["critical", "high", "medium", "low", "info"] as Severity[])
    .filter((s) => summary.bySeverity[s] > 0)
    .map((s) => `${badge(s)} ${summary.bySeverity[s]}`)
    .join("  ");
  console.log(sevLine || chalk.green("  No findings."));
  console.log("");

  const owasp = owaspSummary(summary.byOwasp);
  if (owasp.length > 0) {
    console.log(chalk.bold("  OWASP Agentic Top 10"));
    for (const { category, count } of owasp) {
      console.log(chalk.gray(`  ${category.id}`) + ` ${category.name}: ${count}`);
    }
    console.log("");
  }

  if (summary.findings.length === 0) {
    console.log(chalk.green("  Clean scan — no issues matched our ruleset."));
    console.log("");
    return;
  }

  console.log(chalk.bold("  Findings"));
  console.log("");

  for (const f of summary.findings) {
    printFinding(f);
  }
}

function printFinding(f: Finding): void {
  console.log(`  ${badge(f.severity)} ${chalk.bold(f.title)}`);
  console.log(chalk.gray(`  ${f.serverName} · ${f.location}`));
  console.log(`  ${f.message}`);
  console.log(chalk.gray(`  OWASP: ${f.owasp.id} — ${f.owasp.name}`));
  if (f.cwe) console.log(chalk.gray(`  ${f.cwe}${f.cve ? ` · ${f.cve}` : ""}`));
  console.log(chalk.cyan("  Fix: ") + f.remediation);
  console.log("");
}

export function exitCodeForSummary(summary: ScanSummary): number {
  if (summary.bySeverity.critical > 0) return 2;
  if (summary.bySeverity.high > 0) return 1;
  return 0;
}
