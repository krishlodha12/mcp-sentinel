import type {
  Finding,
  OwaspCategory,
  ScanOptions,
  ScanSummary,
  ScanTarget,
  Severity,
} from "./types.js";
import { severityRank } from "./types.js";
import { ALL_CHECKS } from "./checks/index.js";
import { dedupeFindings } from "./utils.js";

function emptySeverityCounts(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

function countByOwasp(findings: Finding[]): Partial<Record<OwaspCategory, number>> {
  const out: Partial<Record<OwaspCategory, number>> = {};
  for (const f of findings) {
    out[f.owasp.id] = (out[f.owasp.id] ?? 0) + 1;
  }
  return out;
}

export function runChecks(
  targets: ScanTarget[],
  options: ScanOptions = {}
): ScanSummary {
  const start = Date.now();
  const allFindings: Finding[] = [];

  for (const target of targets) {
    for (const check of ALL_CHECKS) {
      allFindings.push(...check.run(target));
    }
  }

  let findings = dedupeFindings(allFindings);

  if (options.minSeverity) {
    const minRank = severityRank(options.minSeverity);
    findings = findings.filter((f) => severityRank(f.severity) <= minRank);
  }

  if (options.includeInfo === false) {
    findings = findings.filter((f) => f.severity !== "info");
  }

  findings.sort((a, b) => {
    const sd = severityRank(a.severity) - severityRank(b.severity);
    if (sd !== 0) return sd;
    return a.title.localeCompare(b.title);
  });

  const bySeverity = emptySeverityCounts();
  for (const f of findings) {
    bySeverity[f.severity]++;
  }

  const toolsChecked = targets.reduce((n, t) => n + t.tools.length, 0);
  const promptsChecked = targets.reduce((n, t) => n + t.prompts.length, 0);
  const resourcesChecked = targets.reduce((n, t) => n + t.resources.length, 0);

  return {
    serversScanned: targets.length,
    toolsChecked,
    promptsChecked,
    resourcesChecked,
    findings,
    bySeverity,
    byOwasp: countByOwasp(findings),
    scannedAt: new Date().toISOString(),
    scanDurationMs: Date.now() - start,
  };
}

export { ALL_CHECKS } from "./checks/index.js";
export { loadAll, loadTarget, discoverTargets } from "./loaders/config-loader.js";
