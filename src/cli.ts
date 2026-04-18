#!/usr/bin/env node
import { resolve } from "node:path";
import { Command } from "commander";
import { loadAll } from "./scanner/engine.js";
import { runChecks } from "./scanner/engine.js";
import { listChecks } from "./scanner/checks/index.js";
import {
  exitCodeForSummary,
  printReport,
} from "./reports/terminal-reporter.js";
import {
  writeJsonReport,
  writeMarkdownReport,
} from "./reports/json-reporter.js";
import type { Severity } from "./scanner/types.js";

const program = new Command();

program
  .name("mcp-sentinel")
  .description(
    "Static security scanner for MCP configs — tool poisoning, injection, permissions, supply chain."
  )
  .version("0.1.0");

program
  .command("scan")
  .description("Scan MCP config files or a directory")
  .argument("[path]", "File or directory to scan", ".")
  .option("-o, --output <file>", "Write JSON report to file")
  .option("-m, --markdown <file>", "Write Markdown report to file")
  .option("--min-severity <level>", "critical|high|medium|low|info")
  .option("--no-info", "Hide informational findings")
  .option("-q, --quiet", "Only print summary counts")
  .action(async (path: string, opts) => {
    try {
      const abs = resolve(path);
      const targets = loadAll(abs);
      const summary = runChecks(targets, {
        minSeverity: opts.minSeverity as Severity | undefined,
        includeInfo: opts.info !== false,
      });

      if (!opts.quiet) {
        printReport(summary);
      } else {
        console.log(
          JSON.stringify({
            servers: summary.serversScanned,
            findings: summary.findings.length,
            critical: summary.bySeverity.critical,
            high: summary.bySeverity.high,
          })
        );
      }

      if (opts.output) writeJsonReport(summary, opts.output);
      if (opts.markdown) writeMarkdownReport(summary, opts.markdown);

      process.exit(exitCodeForSummary(summary));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(3);
    }
  });

program
  .command("checks")
  .description("List all security checks")
  .action(() => {
    for (const c of listChecks()) {
      console.log(`${c.id}\n  ${c.name}\n  ${c.description}\n`);
    }
  });

program.parse();
