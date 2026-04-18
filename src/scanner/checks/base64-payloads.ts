import type { Finding, ScanTarget, SecurityCheck } from "../types.js";
import { owasp } from "../../owasp/mapping.js";
import { makeFindingId, truncateSnippet, walkStrings } from "../utils.js";

const BASE64_LIKE = /(?:[A-Za-z0-9+/]{40,}={0,2})/g;

const DECODED_INSTRUCTION_PATTERNS = [
  /ignore\s+previous/i,
  /system\s+prompt/i,
  /exfiltrate/i,
  /curl\s+http/i,
  /powershell/i,
  /\/bin\/(ba)?sh/i,
  /rm\s+-rf/i,
];

function tryDecodeBase64(segment: string): string | null {
  try {
    const normalized = segment.replace(/\s/g, "");
    if (normalized.length % 4 !== 0) return null;
    const decoded = Buffer.from(normalized, "base64").toString("utf-8");
    if (!/^[\x20-\x7E\n\r\t]+$/.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

function scanForBase64(text: string, target: ScanTarget, location: string, label: string): Finding[] {
  const findings: Finding[] = [];
  const matches = text.match(BASE64_LIKE) ?? [];

  for (const match of matches) {
    const decoded = tryDecodeBase64(match);
    if (!decoded) continue;

    const suspicious = DECODED_INSTRUCTION_PATTERNS.some((p) => p.test(decoded));
    if (!suspicious && decoded.length < 20) continue;

    findings.push({
      id: makeFindingId(),
      checkId: "base64-payload",
      title: suspicious
        ? "Base64-encoded instruction payload in description"
        : "Base64 blob embedded in description",
      severity: suspicious ? "critical" : "medium",
      owasp: owasp("ASI01"),
      serverName: target.serverName,
      location,
      snippet: truncateSnippet(decoded),
      message: `${label} contains a Base64 segment that decodes to readable text. ${
        suspicious ? "Decoded content looks like an instruction or shell command." : "Review whether this belongs in a tool description."
      }`,
      remediation:
        "Remove encoded blobs from descriptions. If encoding is intentional, document it and pin the server version.",
      explanation:
        "Base64 in tool metadata is a common way to hide instructions from casual review. The model may decode or interpret the content depending on context, and it is never needed for legitimate tool docs.",
      references: [
        "https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks",
      ],
      cwe: "CWE-94",
    });
  }

  return findings;
}

export const base64PayloadCheck: SecurityCheck = {
  id: "base64-payload",
  name: "Base64 payload detection",
  description: "Flags Base64 blobs in tool/prompt text that decode to instructions or commands.",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];

    for (const tool of target.tools) {
      findings.push(
        ...scanForBase64(
          tool.description,
          target,
          `${tool.sourcePath}.description`,
          `Tool "${tool.name}"`
        )
      );
    }

    for (const prompt of target.prompts) {
      findings.push(
        ...scanForBase64(
          prompt.description,
          target,
          `${prompt.sourcePath}.description`,
          `Prompt "${prompt.name}"`
        )
      );
    }

    return findings;
  },
};

export const schemaInjectionCheck: SecurityCheck = {
  id: "schema-string-injection",
  name: "Schema description injection",
  description: "Scans inputSchema field descriptions for injection patterns.",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];
    const injectionHints = [
      /;\s*(rm|del|curl|wget|powershell|bash|sh)\b/i,
      /\|\s*(bash|sh|cmd)/i,
      /`[^`]+`/,
      /\$\([^)]+\)/,
    ];

    for (const tool of target.tools) {
      if (!tool.inputSchema) continue;
      walkStrings(tool.inputSchema, tool.sourcePath, (value, path) => {
        if (path.includes("description") && injectionHints.some((p) => p.test(value))) {
          findings.push({
            id: makeFindingId(),
            checkId: "schema-string-injection",
            title: "Shell metacharacters in schema description",
            severity: "medium",
            owasp: owasp("ASI05"),
            serverName: target.serverName,
            location: path,
            snippet: truncateSnippet(value),
            message: `Parameter description for tool "${tool.name}" contains patterns often associated with shell injection examples.`,
            remediation:
              "Keep schema descriptions factual. Never include executable examples with metacharacters in fields the server concatenates into shell commands.",
            explanation:
              "Even documentation-like examples in schema text can steer model behavior. If the server builds shell commands from parameters, this is a direct injection surface.",
            references: ["https://cwe.mitre.org/data/definitions/78.html"],
            cwe: "CWE-78",
          });
        }
      });
    }

    return findings;
  },
};
