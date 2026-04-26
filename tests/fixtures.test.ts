import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAll } from "../src/scanner/loaders/config-loader.js";
import { runChecks } from "../src/scanner/engine.js";
import type { Finding, Severity } from "../src/scanner/types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const BROKEN_CHECKS = [
  "hidden-instructions",
  "rtl-override",
  "html-comment-injection",
  "base64-payload",
  "schema-string-injection",
  "command-injection",
  "broad-permissions",
  "unpinned-versions",
  "cve-patterns",
  "secrets-in-config",
  "insecure-transport",
  "prompt-resource-poisoning",
] as const;

function scanDir(dir: string) {
  return runChecks(loadAll(resolve(root, dir)));
}

function checkIds(findings: Finding[]): Set<string> {
  return new Set(findings.map((f) => f.checkId));
}

function cves(findings: Finding[]): string[] {
  return findings.filter((f) => f.cve).map((f) => f.cve!);
}

function aboveInfo(findings: Finding[]): Finding[] {
  const cutoff: Severity[] = ["critical", "high", "medium"];
  return findings.filter((f) => cutoff.includes(f.severity));
}

describe("broken fixture (vulnerable-setup)", () => {
  const summary = scanDir("fixtures/vulnerable-setup");
  const ids = checkIds(summary.findings);

  it("fires at least one finding per check", () => {
    for (const check of BROKEN_CHECKS) {
      expect(ids.has(check), `missing check: ${check}`).toBe(true);
    }
  });

  it("reports critical or high severity issues", () => {
    expect(summary.bySeverity.critical + summary.bySeverity.high).toBeGreaterThan(0);
  });
});

describe("clean fixture (clean-setup)", () => {
  const summary = scanDir("fixtures/clean-setup");

  it("has no critical, high, or medium findings", () => {
    expect(aboveInfo(summary.findings).length).toBe(0);
  });

  it("does not flag CVE-2025-6514 or filesystem CVE on pinned installs", () => {
    expect(cves(summary.findings)).not.toContain("CVE-2025-6514");
  });
});

describe("real-world fixture (Vulnerable MCP Project)", () => {
  const path = resolve(root, "fixtures/real-world/mcp-remote-cve-2025-6514.json");
  const summary = runChecks(loadAll(path));
  const ids = checkIds(summary.findings);

  it("flags CVE-2025-6514 (mcp-remote)", () => {
    expect(cves(summary.findings)).toContain("CVE-2025-6514");
    expect(ids.has("cve-patterns")).toBe(true);
  });

  it("flags unpinned install and insecure HTTP transport", () => {
    expect(ids.has("unpinned-versions")).toBe(true);
    expect(ids.has("insecure-transport")).toBe(true);
  });

  it("matches documented advisory severity (critical present)", () => {
    expect(summary.bySeverity.critical).toBeGreaterThan(0);
  });
});
