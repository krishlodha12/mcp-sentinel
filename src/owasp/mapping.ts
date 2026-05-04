import type { OwaspCategory, OwaspRef } from "../scanner/types.js";

const OWASP_BASE =
  "https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/";

export const OWASP_CATEGORIES: Record<OwaspCategory, OwaspRef> = {
  ASI01: {
    id: "ASI01",
    name: "Agent Goal Hijack",
    url: OWASP_BASE,
  },
  ASI02: {
    id: "ASI02",
    name: "Tool Misuse & Exploitation",
    url: OWASP_BASE,
  },
  ASI03: {
    id: "ASI03",
    name: "Identity & Privilege Abuse",
    url: OWASP_BASE,
  },
  ASI04: {
    id: "ASI04",
    name: "Agentic Supply Chain Vulnerabilities",
    url: OWASP_BASE,
  },
  ASI05: {
    id: "ASI05",
    name: "Unexpected Code Execution (RCE)",
    url: OWASP_BASE,
  },
  ASI06: {
    id: "ASI06",
    name: "Memory & Context Poisoning",
    url: OWASP_BASE,
  },
  ASI07: {
    id: "ASI07",
    name: "Insecure Inter-Agent Communication",
    url: OWASP_BASE,
  },
  ASI08: {
    id: "ASI08",
    name: "Cascading Failures",
    url: OWASP_BASE,
  },
  ASI09: {
    id: "ASI09",
    name: "Human-Agent Trust Exploitation",
    url: OWASP_BASE,
  },
  ASI10: {
    id: "ASI10",
    name: "Rogue Agents",
    url: OWASP_BASE,
  },
};

export function owasp(id: OwaspCategory): OwaspRef {
  return OWASP_CATEGORIES[id];
}

export function owaspSummary(
  counts: Partial<Record<OwaspCategory, number>>
): { category: OwaspRef; count: number }[] {
  return (Object.keys(counts) as OwaspCategory[])
    .filter((k) => (counts[k] ?? 0) > 0)
    .map((k) => ({ category: OWASP_CATEGORIES[k], count: counts[k]! }))
    .sort((a, b) => b.count - a.count);
}
