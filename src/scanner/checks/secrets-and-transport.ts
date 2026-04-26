import type { Finding, ScanTarget, SecurityCheck } from "../types.js";
import { owasp } from "../../owasp/mapping.js";
import { makeFindingId, truncateSnippet } from "../utils.js";

const SECRET_PATTERNS: { name: string; pattern: RegExp; severity: Finding["severity"] }[] = [
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/, severity: "critical" },
  { name: "GitHub PAT", pattern: /ghp_[A-Za-z0-9]{36,}/, severity: "critical" },
  { name: "GitHub fine-grained PAT", pattern: /github_pat_[A-Za-z0-9_]{20,}/, severity: "critical" },
  { name: "OpenAI API key", pattern: /sk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}/, severity: "critical" },
  { name: "Anthropic API key", pattern: /sk-ant-[A-Za-z0-9\-_]{20,}/, severity: "critical" },
  { name: "Generic Bearer token", pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i, severity: "high" },
  { name: "Private key block", pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, severity: "critical" },
  { name: "Slack token", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/, severity: "high" },
  { name: "Stripe live key", pattern: /sk_live_[A-Za-z0-9]{20,}/, severity: "critical" },
];

const PLACEHOLDER_OK = /^(your_|replace_|changeme|<|\$\{|\{\{)/i;

export const secretsInConfigCheck: SecurityCheck = {
  id: "secrets-in-config",
  name: "Hardcoded secrets in config",
  description: "Detects API keys and tokens embedded in MCP config env blocks.",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];

    for (const [key, value] of Object.entries(target.rawEnv)) {
      if (!value || PLACEHOLDER_OK.test(value)) continue;

      for (const { name, pattern, severity } of SECRET_PATTERNS) {
        if (pattern.test(value)) {
          findings.push({
            id: makeFindingId(),
            checkId: "secrets-in-config",
            title: `${name} in configuration`,
            severity,
            owasp: owasp("ASI03"),
            serverName: target.serverName,
            location: `env.${key}`,
            snippet: truncateSnippet(`${key}=***redacted***`),
            message: `Environment variable ${key} appears to contain a live ${name}. Config files often sync to git or logs.`,
            remediation:
              "Move secrets to OS keychain, .env excluded from git, or secret manager. Reference by env var name only in committed config.",
            explanation:
              "MCP configs are JSON on disk. Any secret in env values is one accidental commit away from being public — and the agent can read env vars through some tools.",
            references: ["https://cwe.mitre.org/data/definitions/798.html"],
            cwe: "CWE-798",
          });
          break;
        }
      }

      if (/password|secret|token|apikey|api_key/i.test(key) && value.length > 8 && !PLACEHOLDER_OK.test(value)) {
        const alreadyFlagged = findings.some((f) => f.location === `env.${key}`);
        if (!alreadyFlagged) {
          findings.push({
            id: makeFindingId(),
            checkId: "secrets-in-config",
            title: "Sensitive value in env var",
            severity: "medium",
            owasp: owasp("ASI03"),
            serverName: target.serverName,
            location: `env.${key}`,
            snippet: `${key}=***`,
            message: `${key} holds a non-placeholder value. Confirm it is not committed to version control.`,
            remediation: "Use secret references instead of inline values.",
            explanation:
              "Even without regex confirmation, secret-like keys with real values in MCP config deserve review.",
            references: [],
            cwe: "CWE-798",
          });
        }
      }
    }

    return findings;
  },
};

export const remoteTransportCheck: SecurityCheck = {
  id: "insecure-transport",
  name: "Insecure remote transport",
  description: "Flags HTTP (non-TLS) remote MCP endpoints in config.",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];
    const candidates = [
      ...(target.remoteUrls ?? []),
      target.commandLine ?? "",
    ];

    for (const blob of candidates) {
      if (!/http:\/\//i.test(blob)) continue;

      findings.push({
        id: makeFindingId(),
        checkId: "insecure-transport",
        title: "Remote MCP endpoint without TLS",
        severity: "high",
        owasp: owasp("ASI07"),
        serverName: target.serverName,
        location: target.sourceFile,
        snippet: truncateSnippet(blob),
        message: "HTTP transport exposes tool calls and auth headers on the network.",
        remediation: "Use https:// or local stdio transport. Terminate TLS at a trusted proxy if needed.",
        explanation:
          "Remote MCP over plain HTTP allows interception and injection of tool results — a direct path to agent goal hijack.",
        references: ["https://modelcontextprotocol.io/"],
        cwe: "CWE-319",
      });
      break;
    }

    return findings;
  },
};
