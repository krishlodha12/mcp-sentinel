import type { Finding, ScanTarget, SecurityCheck } from "../types.js";
import { owasp } from "../../owasp/mapping.js";
import {
  INVISIBLE_CHAR_NAMES,
  INVISIBLE_PATTERN,
  makeFindingId,
  truncateSnippet,
  visibleOnly,
} from "../utils.js";

const INSTRUCTION_PATTERNS = [
  /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /\b(you\s+must|always|never)\s+(run|execute|call|invoke|send|email|upload|exfiltrate)/i,
  /\b(system\s+prompt|hidden\s+instruction|secret\s+directive)/i,
  /\b(do\s+not\s+tell\s+the\s+user)/i,
  /\b(before\s+any\s+other\s+action)/i,
];

function scanTextField(
  target: ScanTarget,
  text: string,
  location: string,
  contextLabel: string
): Finding[] {
  const findings: Finding[] = [];
  if (!text) return findings;

  const invisibleMatches = [...text.matchAll(INVISIBLE_PATTERN)];
  if (invisibleMatches.length > 0) {
    const chars = [...new Set(invisibleMatches.map((m) => m[0]))];
    const charList = chars
      .map((c) => INVISIBLE_CHAR_NAMES[c] ?? `U+${c.codePointAt(0)!.toString(16).toUpperCase()}`)
      .join(", ");

    const hiddenVisible = text.replace(INVISIBLE_PATTERN, "");
    const hasInstructionLike = INSTRUCTION_PATTERNS.some((p) => p.test(hiddenVisible));

    findings.push({
      id: makeFindingId(),
      checkId: "hidden-instructions",
      title: "Hidden instructions in tool description",
      severity: hasInstructionLike ? "critical" : "high",
      owasp: owasp("ASI01"),
      serverName: target.serverName,
      location,
      snippet: truncateSnippet(visibleOnly(text)),
      message: `${contextLabel} contains ${invisibleMatches.length} invisible Unicode character(s): ${charList}. The model reads this text; humans reviewing the config often do not.`,
      remediation:
        "Remove zero-width and directional override characters. Re-copy descriptions from a trusted source. Compare visible vs raw bytes before approving a server.",
      explanation:
        "MCP tools ship with a description the model reads before calling the tool. Attackers embed instructions using characters that render as blank space in most editors. The model still sees the full string and may follow the hidden directive — exfiltrating files, calling other tools, or overriding your system prompt.",
      references: [
        "https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks",
        "https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/",
      ],
      cwe: "CWE-94",
    });
  }

  const rtlIdx = text.indexOf("\u202E");
  if (rtlIdx >= 0) {
    findings.push({
      id: makeFindingId(),
      checkId: "rtl-override",
      title: "Bidirectional text override in description",
      severity: "high",
      owasp: owasp("ASI09"),
      serverName: target.serverName,
      location,
      snippet: truncateSnippet(text),
      message: `RIGHT-TO-LEFT OVERRIDE (U+202E) at position ${rtlIdx} can visually reorder text in UI reviews.`,
      remediation: "Remove U+202E and audit the full description in a hex-aware viewer.",
      explanation:
        "The Unicode bidi override character makes text display in reverse order in many UIs. A description that looks harmless on screen can read very differently to the model or in raw form.",
      references: ["https://unicode.org/reports/tr9/"],
      cwe: "CWE-451",
    });
  }

  const htmlComment = /<!--[\s\S]*?-->/.exec(text);
  if (htmlComment) {
    findings.push({
      id: makeFindingId(),
      checkId: "html-comment-injection",
      title: "HTML comment block in description",
      severity: "medium",
      owasp: owasp("ASI01"),
      serverName: target.serverName,
      location,
      snippet: truncateSnippet(htmlComment[0]),
      message: "HTML comments in tool text are invisible in some renderers but still present in the model context.",
      remediation: "Strip HTML comments from tool, prompt, and resource descriptions.",
      explanation:
        "Some MCP clients strip markdown/HTML for humans but pass the raw string to the model. Comments are a common place to stash secondary instructions.",
      references: [],
      cwe: "CWE-94",
    });
  }

  return findings;
}

export const hiddenInstructionsCheck: SecurityCheck = {
  id: "hidden-instructions",
  name: "Hidden instruction detection",
  description:
    "Finds invisible Unicode, bidi overrides, and HTML comments in tool/prompt/resource text.",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];

    for (const tool of target.tools) {
      findings.push(
        ...scanTextField(
          target,
          tool.description,
          `${tool.sourcePath}.description`,
          `Tool "${tool.name}" description`
        )
      );
    }

    for (const prompt of target.prompts) {
      findings.push(
        ...scanTextField(
          target,
          prompt.description,
          `${prompt.sourcePath}.description`,
          `Prompt "${prompt.name}" description`
        )
      );
    }

    for (const resource of target.resources) {
      findings.push(
        ...scanTextField(
          target,
          resource.description,
          `${resource.sourcePath}.description`,
          `Resource "${resource.name}" description`
        )
      );
    }

    return findings;
  },
};
