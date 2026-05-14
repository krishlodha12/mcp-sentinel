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
import { runReplay } from "./replay/engine.js";
import {
  exitCodeForReplay,
  printReplayReport,
} from "./replay/reporters/terminal-reporter.js";
import {
  writeReplayJsonReport,
  writeReplayMarkdownReport,
} from "./replay/reporters/json-reporter.js";
import { runMutation } from "./mutation/engine.js";
import {
  exitCodeForMutation,
  printMutationReport,
} from "./mutation/reporters/terminal-reporter.js";
import {
  writeMutationJsonReport,
  writeMutationMarkdownReport,
} from "./mutation/reporters/json-reporter.js";
import { runDecoy } from "./decoy/engine.js";
import {
  exitCodeForDecoy,
  printDecoyReport,
} from "./decoy/reporters/terminal-reporter.js";
import {
  writeDecoyJsonReport,
  writeDecoyMarkdownReport,
} from "./decoy/reporters/json-reporter.js";

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

program
  .command("replay")
  .description(
    "Run attack corpus against an agent fixture in an isolated sandbox copy"
  )
  .argument("[path]", "Agent fixture directory (contains agent.json)", ".")
  .option("-o, --output <file>", "Write JSON replay report to file")
  .option("-m, --markdown <file>", "Write Markdown replay report to file")
  .option("--corpus <file>", "Custom attack corpus JSON")
  .option("--keep-sandbox", "Do not delete temp sandbox after replay")
  .option("-q, --quiet", "Only print summary counts")
  .action(async (path: string, opts) => {
    try {
      const abs = resolve(path);
      const summary = runReplay(abs, {
        corpusPath: opts.corpus,
        keepSandbox: opts.keepSandbox,
      });

      if (!opts.quiet) {
        printReplayReport(summary);
      } else {
        console.log(
          JSON.stringify({
            agent: summary.agentName,
            attacks: summary.attacksRun,
            exploited: summary.exploited,
            blocked: summary.blocked,
          })
        );
      }

      if (opts.output) writeReplayJsonReport(summary, opts.output);
      if (opts.markdown) writeReplayMarkdownReport(summary, opts.markdown);

      process.exit(exitCodeForReplay(summary));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(3);
    }
  });

program
  .command("mutate")
  .description(
    "Harden agent policies/prompt from replay failures, then re-run corpus for before/after score"
  )
  .argument("[path]", "Agent fixture directory (contains agent.json)", ".")
  .option("-o, --output <file>", "Write JSON mutation report to file")
  .option("-m, --markdown <file>", "Write Markdown mutation report to file")
  .option("--corpus <file>", "Custom attack corpus JSON")
  .option("--keep-sandbox", "Do not delete temp sandbox after mutation")
  .option("--write-back", "Overwrite agent.json in the fixture directory")
  .option("-q, --quiet", "Only print summary counts")
  .action(async (path: string, opts) => {
    try {
      const abs = resolve(path);
      const summary = runMutation(abs, {
        corpusPath: opts.corpus,
        keepSandbox: opts.keepSandbox,
        writeBack: opts.writeBack,
      });

      if (!opts.quiet) {
        printMutationReport(summary);
      } else {
        console.log(
          JSON.stringify({
            agent: summary.agentName,
            before: summary.score.exploitRateBefore,
            after: summary.score.exploitRateAfter,
            mutations: summary.mutations.length,
            exploitedDelta: summary.score.exploitedDelta,
          })
        );
      }

      if (opts.output) writeMutationJsonReport(summary, opts.output);
      if (opts.markdown) writeMutationMarkdownReport(summary, opts.markdown);

      process.exit(exitCodeForMutation(summary));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(3);
    }
  });

program
  .command("decoy")
  .description(
    "AICON decoy routing — shunt exploited attacks to ghost tools while hardening the real agent path"
  )
  .argument("[path]", "Agent fixture directory (contains agent.json)", ".")
  .option("-o, --output <file>", "Write JSON decoy report to file")
  .option("-m, --markdown <file>", "Write Markdown decoy report to file")
  .option("--corpus <file>", "Custom attack corpus JSON")
  .option("--catalog <file>", "Custom ghost-tool catalog JSON")
  .option("--keep-sandbox", "Do not delete temp sandboxes after decoy run")
  .option("--write-back", "Overwrite agent.json in the fixture directory")
  .option("-q, --quiet", "Only print summary counts")
  .action(async (path: string, opts) => {
    try {
      const abs = resolve(path);
      const summary = runDecoy(abs, {
        corpusPath: opts.corpus,
        catalogPath: opts.catalog,
        keepSandbox: opts.keepSandbox,
        writeBack: opts.writeBack,
      });

      if (!opts.quiet) {
        printDecoyReport(summary);
      } else {
        console.log(
          JSON.stringify({
            agent: summary.agentName,
            routed: summary.score.attacksRouted,
            triggers: summary.score.detections,
            realBefore: summary.score.realExploitRateBefore,
            realAfter: summary.score.realExploitRateAfter,
          })
        );
      }

      if (opts.output) writeDecoyJsonReport(summary, opts.output);
      if (opts.markdown) writeDecoyMarkdownReport(summary, opts.markdown);

      process.exit(exitCodeForDecoy(summary));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(3);
    }
  });

program.parse();
