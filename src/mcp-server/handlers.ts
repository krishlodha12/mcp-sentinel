import { mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { loadAll, runChecks } from "../scanner/engine.js";
import { listChecks } from "../scanner/checks/index.js";
import { runReplay } from "../replay/engine.js";
import { runProbe } from "../live/probe.js";
import { runMutation } from "../mutation/engine.js";
import { runDecoy } from "../decoy/engine.js";
import { runTwin } from "../twin/engine.js";
import type { Severity } from "../scanner/types.js";
import {
  formatDecoySummary,
  formatMutationSummary,
  formatProbeSummary,
  formatReplaySummary,
  formatScanSummary,
  formatTwinSummary,
} from "./format.js";

export function materializeConfigPath(path?: string, configJson?: string): string {
  if (path?.trim()) return resolve(path.trim());
  if (!configJson?.trim()) {
    throw new Error("Provide path (file or directory) or config_json.");
  }
  const dir = mkdtempSync(join(tmpdir(), "mcp-sentinel-mcp-"));
  writeFileSync(join(dir, "mcp.json"), configJson, "utf-8");
  return dir;
}

export function resolveMcpConfigPath(path: string): string {
  const abs = resolve(path);
  return abs.endsWith(".json") ? abs : join(abs, "mcp.json");
}

export async function handleScanMcpConfig(args: {
  path?: string;
  config_json?: string;
  min_severity?: Severity;
  include_info?: boolean;
}) {
  const targetPath = materializeConfigPath(args.path, args.config_json);
  const targets = loadAll(targetPath);
  const summary = runChecks(targets, {
    minSeverity: args.min_severity,
    includeInfo: args.include_info !== false,
  });
  return formatScanSummary(summary);
}

export async function handleProbeMcpConfig(args: {
  path: string;
  allow_remote?: boolean;
  allow_any_package?: boolean;
  timeout_ms?: number;
}) {
  const configPath = resolveMcpConfigPath(args.path);
  const summary = await runProbe(configPath, {
    allowRemote: args.allow_remote ?? false,
    allowAnyPackage: args.allow_any_package ?? false,
    timeoutMs: args.timeout_ms ?? 45_000,
  });
  return formatProbeSummary(summary);
}

export async function handleReplayAgentFixture(args: {
  path: string;
  live?: boolean;
  allow_any_package?: boolean;
}) {
  const summary = await runReplay(resolve(args.path), {
    live: args.live ?? false,
    liveProbeOptions: args.live
      ? { allowAnyPackage: args.allow_any_package ?? false }
      : undefined,
  });
  return formatReplaySummary(summary);
}

export function handleListSecurityChecks() {
  return listChecks().map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
  }));
}

export function handleMutateAgentFixture(args: { path: string }) {
  const summary = runMutation(resolve(args.path));
  return formatMutationSummary(summary);
}

export function handleDecoyAgentFixture(args: { path: string }) {
  const summary = runDecoy(resolve(args.path));
  return formatDecoySummary(summary);
}

export function handleTwinFleetFixture(args: { path: string }) {
  const summary = runTwin(resolve(args.path));
  return formatTwinSummary(summary);
}
