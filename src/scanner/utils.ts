import { randomBytes } from "node:crypto";
import type { Finding } from "../scanner/types.js";

export function makeFindingId(): string {
  return randomBytes(4).toString("hex");
}

export function truncateSnippet(text: string, max = 120): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1) + "…";
}

export function visibleOnly(text: string): string {
  return text.replace(/[\u200B-\u200D\uFEFF\u2060\u180E\u00AD]/g, "");
}

export function walkStrings(
  obj: unknown,
  path: string,
  cb: (value: string, path: string) => void
): void {
  if (typeof obj === "string") {
    cb(obj, path);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walkStrings(item, `${path}[${i}]`, cb));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [key, val] of Object.entries(obj)) {
      walkStrings(val, path ? `${path}.${key}` : key, cb);
    }
  }
}

export function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    const key = `${f.checkId}|${f.serverName}|${f.location}|${f.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export const INVISIBLE_CHAR_NAMES: Record<string, string> = {
  "\u200B": "ZERO WIDTH SPACE (U+200B)",
  "\u200C": "ZERO WIDTH NON-JOINER (U+200C)",
  "\u200D": "ZERO WIDTH JOINER (U+200D)",
  "\uFEFF": "BYTE ORDER MARK (U+FEFF)",
  "\u2060": "WORD JOINER (U+2060)",
  "\u180E": "MONGOLIAN VOWEL SEPARATOR (U+180E)",
  "\u00AD": "SOFT HYPHEN (U+00AD)",
  "\u202E": "RIGHT-TO-LEFT OVERRIDE (U+202E)",
  "\u202A": "LEFT-TO-RIGHT EMBEDDING (U+202A)",
  "\u202B": "RIGHT-TO-LEFT EMBEDDING (U+202B)",
  "\u202C": "POP DIRECTIONAL FORMATTING (U+202C)",
  "\u202D": "LEFT-TO-RIGHT OVERRIDE (U+202D)",
  "\u2066": "LEFT-TO-RIGHT ISOLATE (U+2066)",
  "\u2067": "RIGHT-TO-LEFT ISOLATE (U+2067)",
  "\u2068": "FIRST STRONG ISOLATE (U+2068)",
  "\u2069": "POP DIRECTIONAL ISOLATE (U+2069)",
};

export const INVISIBLE_PATTERN =
  /[\u200B-\u200D\uFEFF\u2060\u180E\u00AD\u202A-\u202E\u2066-\u2069]/g;
