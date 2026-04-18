import type { Finding, ScanTarget, SecurityCheck } from "../types.js";
import { owasp } from "../../owasp/mapping.js";
import { makeFindingId, truncateSnippet } from "../utils.js";

const UNPINNED_VERSIONS = new Set([
  "latest",
  "*",
  "next",
  "canary",
  "nightly",
  "dev",
  "main",
  "master",
]);

const RANGE_PREFIX = /^[\^~><=]/;

function isUnpinned(version: string | undefined): boolean {
  if (!version) return true;
  const v = version.trim().toLowerCase();
  if (UNPINNED_VERSIONS.has(v)) return true;
  if (RANGE_PREFIX.test(v)) return true;
  if (v.includes("||") || v.includes(" - ")) return true;
  return false;
}

export const unpinnedVersionsCheck: SecurityCheck = {
  id: "unpinned-versions",
  name: "Unpinned package versions",
  description: "Detects MCP packages installed without a locked version.",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];

    for (const pkg of target.packages) {
      if (isUnpinned(pkg.version)) {
        findings.push({
          id: makeFindingId(),
          checkId: "unpinned-versions",
          title: "Unpinned package version",
          severity: pkg.version ? "high" : "critical",
          owasp: owasp("ASI04"),
          serverName: target.serverName,
          location: pkg.sourcePath,
          snippet: truncateSnippet(
            `${pkg.identifier}${pkg.version ? `@${pkg.version}` : " (no version pin)"}`
          ),
          message: pkg.version
            ? `Package ${pkg.identifier} uses floating version "${pkg.version}". A compromised publish would install on next run.`
            : `Package ${pkg.identifier} has no version pin (e.g. npx -y without @version).`,
          remediation:
            "Pin exact semver in config: npx @scope/pkg@1.2.3. Commit lockfiles where applicable. Re-scan after upgrades.",
          explanation:
            "MCP configs often use npx -y package-name which always resolves to latest. Supply-chain attacks against npm/PyPI are a practical path to malicious tool definitions.",
          references: [
            "https://modelcontextprotocol.io/registry/about",
            "https://cwe.mitre.org/data/definitions/829.html",
          ],
          cwe: "CWE-829",
        });
      }
    }

    if (target.commandLine) {
      if (/\bnpx\b/.test(target.commandLine) && /\s-y\b/.test(target.commandLine)) {
        if (!/@[\d]/.test(target.commandLine.split("npx")[1] ?? "")) {
          findings.push({
            id: makeFindingId(),
            checkId: "unpinned-versions",
            title: "npx -y without explicit version",
            severity: "high",
            owasp: owasp("ASI04"),
            serverName: target.serverName,
            location: target.sourceFile,
            snippet: truncateSnippet(target.commandLine),
            message: "npx -y pulls the latest matching package every time the agent starts.",
            remediation: "Add @x.y.z to the package name in args.",
            explanation:
              "This is the most common MCP install pattern and the most common supply-chain footgun. Pinning costs nothing and prevents surprise upgrades.",
            references: [],
            cwe: "CWE-829",
          });
        }
      }
    }

    return findings;
  },
};
