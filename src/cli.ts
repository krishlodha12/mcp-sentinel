#!/usr/bin/env node
import { join, resolve } from "node:path";
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
import { runTwin } from "./twin/engine.js";
import {
  printTwinReport,
  exitCodeForTwin,
} from "./twin/reporters/terminal-reporter.js";
import {
  writeTwinJsonReport,
  writeTwinMarkdownReport,
} from "./twin/reporters/json-reporter.js";
import { runProbe } from "./live/probe.js";
import {
  exitCodeForProbe,
  printProbeReport,
} from "./live/reporters/terminal-reporter.js";
import {
  writeProbeJsonReport,
  writeProbeMarkdownReport,
} from "./live/reporters/json-reporter.js";
import { runTapProxy } from "./tap/proxy.js";
import { runForensics, exitCodeForForensics } from "./tap/forensics.js";
import { printForensicsReport } from "./tap/reporters/terminal-reporter.js";
import {
  writeForensicsJsonReport,
  writeForensicsMarkdownReport,
} from "./tap/reporters/json-reporter.js";

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
  .option("--live", "Spawn local MCP servers and merge runtime tools before replay")
  .option("--allow-any-package", "Allow non-official packages during live probe")
  .option("-q, --quiet", "Only print summary counts")
  .action(async (path: string, opts) => {
    try {
      const abs = resolve(path);
      const summary = await runReplay(abs, {
        corpusPath: opts.corpus,
        keepSandbox: opts.keepSandbox,
        live: opts.live,
        liveProbeOptions: opts.live
          ? { allowAnyPackage: opts.allowAnyPackage }
          : undefined,
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

program
  .command("probe")
  .description(
    "Live probe — spawn local MCP servers from your config, list runtime tools, compare to static scan"
  )
  .argument("[path]", "mcp.json or directory containing mcp.json", ".")
  .option("-o, --output <file>", "Write JSON probe report to file")
  .option("-m, --markdown <file>", "Write Markdown probe report to file")
  .option("--allow-remote", "Allow remote URL entries (you must own the endpoint)")
  .option("--allow-any-package", "Allow packages outside @modelcontextprotocol/* allowlist")
  .option("--timeout <ms>", "Per-server connect timeout", "45000")
  .option("-q, --quiet", "Only print summary counts")
  .action(async (path: string, opts) => {
    try {
      const abs = resolve(path);
      const configPath = abs.endsWith(".json") ? abs : join(abs, "mcp.json");
      const summary = await runProbe(configPath, {
        allowRemote: opts.allowRemote,
        allowAnyPackage: opts.allowAnyPackage,
        timeoutMs: Number(opts.timeout),
      });

      if (!opts.quiet) {
        printProbeReport(summary);
      } else {
        console.log(
          JSON.stringify({
            config: summary.configPath,
            connected: summary.servers.filter((s) => s.status === "connected").length,
            failed: summary.servers.filter((s) => s.status === "failed").length,
            liveTools: summary.servers.reduce((n, s) => n + s.tools.length, 0),
          })
        );
      }

      if (opts.output) writeProbeJsonReport(summary, opts.output);
      if (opts.markdown) writeProbeMarkdownReport(summary, opts.markdown);

      process.exit(exitCodeForProbe(summary));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(3);
    }
  });

program
  .command("tap")
  .description(
    "Transparent stdio proxy — log every MCP JSON-RPC message between client and upstream server"
  )
  .allowExcessArguments(true)
  .option("--log <file>", "JSONL session log path", "mcp-session.jsonl")
  .option("--session-id <id>", "Optional session identifier")
  .action(async (opts) => {
    try {
      const raw = process.argv;
      const tapIdx = raw.lastIndexOf("tap");
      const sepIdx = raw.indexOf("--", tapIdx + 1);
      if (sepIdx < 0 || sepIdx >= raw.length - 1) {
        console.error(
          "Usage: mcp-sentinel tap [--log <file>] [--session-id <id>] -- <command> [args...]"
        );
        console.error(
          "Example: mcp-sentinel tap --log session.jsonl -- npx -y @modelcontextprotocol/server-memory"
        );
        process.exit(3);
      }

      const upstream = raw.slice(sepIdx + 1);
      const command = upstream[0];
      const args = upstream.slice(1);
      const logPath = resolve(opts.log);

      const code = await runTapProxy({
        logPath,
        sessionId: opts.sessionId,
        command,
        args,
      });

      process.exit(code);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(3);
    }
  });

program
  .command("forensics")
  .description(
    "Analyze a tap session log — match live traffic against runtime signals and attack corpus"
  )
  .argument("<session>", "Path to JSONL session log from tap")
  .option("-o, --output <file>", "Write JSON forensics report to file")
  .option("-m, --markdown <file>", "Write Markdown forensics report to file")
  .option("--corpus <file>", "Custom attack corpus JSON")
  .option("--signals <file>", "Custom runtime signals catalog JSON")
  .option("-q, --quiet", "Only print summary counts")
  .action(async (session: string, opts) => {
    try {
      const abs = resolve(session);
      const summary = runForensics(abs, {
        corpusPath: opts.corpus,
        signalsPath: opts.signals,
      });

      if (!opts.quiet) {
        printForensicsReport(summary);
      } else {
        console.log(
          JSON.stringify({
            sessionId: summary.sessionId,
            toolCalls: summary.toolCallCount,
            matches: summary.matches.length,
            critical: summary.bySeverity.critical ?? 0,
            high: summary.bySeverity.high ?? 0,
          })
        );
      }

      if (opts.output) writeForensicsJsonReport(summary, opts.output);
      if (opts.markdown) writeForensicsMarkdownReport(summary, opts.markdown);

      process.exit(exitCodeForForensics(summary));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(3);
    }
  });

program
  .command("twin")
  .description(
    "Closed-loop attack twin — multi-agent probe, intel sharing, cross-harden, fleet decoy, verify"
  )
  .argument("[path]", "Fleet fixture directory (contains fleet.json)", ".")
  .option("-o, --output <file>", "Write JSON twin report to file")
  .option("-m, --markdown <file>", "Write Markdown twin report to file")
  .option("--corpus <file>", "Custom attack corpus JSON")
  .option("--catalog <file>", "Custom ghost-tool catalog JSON")
  .option("--keep-sandbox", "Do not delete temp sandboxes after twin run")
  .option("--write-back", "Overwrite agent.json in fleet fixture directories")
  .option("-q, --quiet", "Only print summary counts")
  .action(async (path: string, opts) => {
    try {
      const abs = resolve(path);
      const summary = runTwin(abs, {
        corpusPath: opts.corpus,
        catalogPath: opts.catalog,
        keepSandbox: opts.keepSandbox,
        writeBack: opts.writeBack,
      });

      if (!opts.quiet) {
        printTwinReport(summary);
      } else {
        console.log(
          JSON.stringify({
            fleet: summary.fleetName,
            before: summary.score.fleetExploitRateBefore,
            after: summary.score.fleetExploitRateAfter,
            intel: summary.score.intelEntries,
            watchlist: summary.score.watchlistSize,
            decoy: summary.score.decoyDetections,
          })
        );
      }

      if (opts.output) writeTwinJsonReport(summary, opts.output);
      if (opts.markdown) writeTwinMarkdownReport(summary, opts.markdown);

      process.exit(exitCodeForTwin(summary));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(3);
    }
  });

program.parse();
