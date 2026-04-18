import type { Finding, ScanTarget, SecurityCheck } from "../types.js";
import { owasp } from "../../owasp/mapping.js";
import { makeFindingId, truncateSnippet } from "../utils.js";

const BROAD_PATH_PATTERNS = [
  { pattern: /^(\/|\\|[A-Za-z]:\\?)$/, label: "filesystem root" },
  { pattern: /^\*\*$/, label: "glob ** (entire tree)" },
  { pattern: /^\*\/\*$/, label: "glob */*" },
  { pattern: /^~$|^~\/$|^~\\/, label: "home directory root" },
  { pattern: /^\/etc|^\/usr|^\/var|^\/System|^C:\\Windows/i, label: "sensitive system path" },
  { pattern: /ALLOWED_DIRECTORIES.*\*/i, label: "wildcard allowed directory" },
];

const BROAD_ENV_KEYS = [
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "ALLUSERSPROFILE",
  "PATH",
  "SSH_AUTH_SOCK",
];

const PERMISSION_KEYWORDS = [
  "root",
  "admin",
  "sudo",
  "allow_all",
  "allowAll",
  "unrestricted",
  "full_access",
  "fullAccess",
  "ALL_FILES",
];

export const broadPermissionsCheck: SecurityCheck = {
  id: "broad-permissions",
  name: "Over-broad permissions",
  description: "Flags configs that grant root, home, or wildcard filesystem access.",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];
    const configBlob = JSON.stringify({
      env: target.rawEnv,
      tools: target.tools,
      command: target.commandLine,
    });

    for (const [key, value] of Object.entries(target.rawEnv)) {
      if (BROAD_ENV_KEYS.includes(key) && /\/|\\|\*/.test(value)) {
        findings.push({
          id: makeFindingId(),
          checkId: "broad-permissions",
          title: "Environment grants broad path scope",
          severity: "high",
          owasp: owasp("ASI03"),
          serverName: target.serverName,
          location: `env.${key}`,
          snippet: truncateSnippet(`${key}=${value}`),
          message: `${key} points at a wide directory scope. Any tool compromise inherits that reach.`,
          remediation:
            "Scope MCP servers to the smallest directory or resource set. Prefer per-project paths over HOME or drive roots.",
          explanation:
            "Filesystem MCP servers read an allowed-directory list from env vars. Pointing at home or root means a single poisoned tool description can exfiltrate everything the agent user can read.",
          references: [
            "https://modelcontextprotocol.io/docs/concepts/tools",
          ],
          cwe: "CWE-250",
        });
      }

      for (const { pattern, label } of BROAD_PATH_PATTERNS) {
        if (pattern.test(value)) {
          findings.push({
            id: makeFindingId(),
            checkId: "broad-permissions",
            title: "Over-broad filesystem permission",
            severity: "critical",
            owasp: owasp("ASI03"),
            serverName: target.serverName,
            location: `env.${key}`,
            snippet: truncateSnippet(value),
            message: `Value for ${key} matches ${label}.`,
            remediation: "Replace with a dedicated project subdirectory. Never mount / or C:\\ for agent tools.",
            explanation:
              "This is the agent equivalent of giving a mobile app access to all photos when it only needs one album. Narrow paths limit blast radius when something else goes wrong.",
            references: [],
            cwe: "CWE-250",
          });
        }
      }
    }

    for (const kw of PERMISSION_KEYWORDS) {
      if (configBlob.toLowerCase().includes(kw.toLowerCase())) {
        findings.push({
          id: makeFindingId(),
          checkId: "broad-permissions",
          title: "Permission keyword in configuration",
          severity: "medium",
          owasp: owasp("ASI03"),
          serverName: target.serverName,
          location: target.sourceFile,
          snippet: kw,
          message: `Config references "${kw}" — verify this server is not running with elevated privileges.`,
          remediation: "Run MCP servers as an unprivileged user. Drop sudo/admin flags from launch config.",
          explanation:
            "Agents inherit OS permissions from the MCP server process. Keywords like admin or sudo in config often mean the server can do more than the task requires.",
          references: [],
          cwe: "CWE-250",
        });
      }
    }

    for (const tool of target.tools) {
      const blob = JSON.stringify(tool);
      if (/read_file|write_file|list_directory/i.test(tool.name)) {
        for (const { pattern, label } of BROAD_PATH_PATTERNS) {
          const pathMatch = blob.match(/"path"[^"]*"([^"]+)"/);
          if (pathMatch && pattern.test(pathMatch[1])) {
            findings.push({
              id: makeFindingId(),
              checkId: "broad-permissions",
              title: "Filesystem tool scoped to sensitive path",
              severity: "high",
              owasp: owasp("ASI03"),
              serverName: target.serverName,
              location: tool.sourcePath,
              snippet: pathMatch[1],
              message: `Filesystem tool "${tool.name}" example or default uses ${label}.`,
              remediation: "Document minimal paths in tool descriptions; enforce roots server-side.",
              explanation:
                "Filesystem tools are high-value targets. Defaults that mention / or ~ teach the model to request broad paths.",
              references: [],
              cwe: "CWE-22",
            });
          }
        }
      }
    }

    return findings;
  },
};
