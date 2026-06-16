import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AttackCorpus } from "../replay/types.js";
import type {
  ParsedSession,
  ParsedToolCall,
  RuntimeMatchEvidence,
  RuntimeMatchResult,
  RuntimeSignal,
  RuntimeSignalMatch,
  RuntimeSignalsCatalog,
} from "./types.js";

const DEFAULT_SIGNALS = join(
  dirname(fileURLToPath(import.meta.url)),
  "runtime-signals.json"
);

export function loadRuntimeSignals(path?: string): RuntimeSignalsCatalog {
  const signalsPath = path ?? DEFAULT_SIGNALS;
  const raw = JSON.parse(readFileSync(signalsPath, "utf-8")) as RuntimeSignalsCatalog;
  if (!raw.signals?.length) {
    throw new Error(`Runtime signals catalog empty or invalid: ${signalsPath}`);
  }
  return raw;
}

function regex(pattern: string, flags?: string): RegExp {
  return new RegExp(pattern, flags ?? "i");
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toolMatchesPattern(tool: string, toolPattern?: string): boolean {
  if (!toolPattern) return true;
  return regex(toolPattern).test(tool);
}

function matchArgsPattern(
  session: ParsedSession,
  match: RuntimeSignalMatch
): RuntimeMatchEvidence[] {
  if (!match.pattern) return [];
  const re = regex(match.pattern, match.flags);
  const hits: RuntimeMatchEvidence[] = [];

  for (const call of session.toolCalls) {
    if (!toolMatchesPattern(call.tool, match.toolPattern)) continue;
    const text = stringifyValue(call.args);
    if (!re.test(text)) continue;
    hits.push({
      kind: "tool-call",
      message: `Tool "${call.tool}" args match /${match.pattern}/`,
      tool: call.tool,
      ts: call.ts,
      callIndex: call.index,
    });
  }

  return hits;
}

function matchResponsePattern(
  session: ParsedSession,
  match: RuntimeSignalMatch
): RuntimeMatchEvidence[] {
  if (!match.pattern) return [];
  const re = regex(match.pattern, match.flags);
  const hits: RuntimeMatchEvidence[] = [];

  for (const call of session.toolCalls) {
    if (call.response === undefined) continue;
    const text = stringifyValue(call.response);
    if (!re.test(text)) continue;
    hits.push({
      kind: "response",
      message: `Tool "${call.tool}" response matches /${match.pattern}/`,
      tool: call.tool,
      ts: call.responseTs ?? call.ts,
      callIndex: call.index,
    });
  }

  return hits;
}

function parseTs(ts: string): number {
  return Date.parse(ts);
}

function matchBurst(
  session: ParsedSession,
  match: RuntimeSignalMatch
): RuntimeMatchEvidence[] {
  const minCalls = match.minCalls ?? 10;
  const windowMs = match.windowMs ?? 60_000;
  const byTool = new Map<string, ParsedToolCall[]>();

  for (const call of session.toolCalls) {
    const list = byTool.get(call.tool) ?? [];
    list.push(call);
    byTool.set(call.tool, list);
  }

  const hits: RuntimeMatchEvidence[] = [];

  for (const [tool, calls] of byTool) {
    if (calls.length < minCalls) continue;

    const sorted = [...calls].sort((a, b) => parseTs(a.ts) - parseTs(b.ts));
    for (let i = 0; i <= sorted.length - minCalls; i++) {
      const windowStart = parseTs(sorted[i].ts);
      const windowEnd = windowStart + windowMs;
      const inWindow = sorted.filter(
        (c) => parseTs(c.ts) >= windowStart && parseTs(c.ts) <= windowEnd
      );
      if (inWindow.length >= minCalls) {
        hits.push({
          kind: "burst",
          message: `Tool "${tool}" invoked ${inWindow.length} times within ${windowMs / 1000}s`,
          tool,
          ts: sorted[i].ts,
          callIndex: sorted[i].index,
        });
        break;
      }
    }
  }

  return hits;
}

function matchSensitivePaths(
  session: ParsedSession,
  match: RuntimeSignalMatch
): RuntimeMatchEvidence[] {
  const paths = match.paths ?? [];
  if (paths.length === 0) return [];

  const hits: RuntimeMatchEvidence[] = [];

  for (const call of session.toolCalls) {
    const text = stringifyValue(call.args);
    for (const path of paths) {
      if (!text.includes(path)) continue;
      hits.push({
        kind: "path",
        message: `Tool "${call.tool}" args reference sensitive path "${path}"`,
        tool: call.tool,
        ts: call.ts,
        callIndex: call.index,
      });
      break;
    }
  }

  return hits;
}

function toolDescriptionMap(
  snapshot: { name: string; description: string }[]
): Map<string, string> {
  return new Map(snapshot.map((t) => [t.name, t.description]));
}

function matchToolListDrift(session: ParsedSession): RuntimeMatchEvidence[] {
  const snapshots = session.toolListSnapshots;
  if (snapshots.length < 2) return [];

  const hits: RuntimeMatchEvidence[] = [];
  const baseline = toolDescriptionMap(snapshots[0].tools);

  for (let i = 1; i < snapshots.length; i++) {
    const current = toolDescriptionMap(snapshots[i].tools);
    const changed: string[] = [];

    for (const [name, desc] of baseline) {
      const now = current.get(name);
      if (now !== undefined && now !== desc) changed.push(name);
    }

    for (const name of current.keys()) {
      if (!baseline.has(name)) changed.push(`+${name}`);
    }

    if (changed.length > 0) {
      hits.push({
        kind: "drift",
        message: `tools/list changed at ${snapshots[i].ts}: ${changed.slice(0, 5).join(", ")}`,
        ts: snapshots[i].ts,
      });
    }
  }

  return hits;
}

function evaluateSignal(
  session: ParsedSession,
  signal: RuntimeSignal
): RuntimeMatchEvidence[] {
  switch (signal.match.type) {
    case "tool-call-args-pattern":
      return matchArgsPattern(session, signal.match);
    case "tool-response-pattern":
      return matchResponsePattern(session, signal.match);
    case "tool-call-burst":
      return matchBurst(session, signal.match);
    case "sensitive-path-access":
      return matchSensitivePaths(session, signal.match);
    case "tool-list-drift":
      return matchToolListDrift(session);
    default:
      return [];
  }
}

export function matchSessionSignals(
  session: ParsedSession,
  catalog: RuntimeSignalsCatalog,
  corpus?: AttackCorpus
): RuntimeMatchResult[] {
  const attackNames = new Map(
    (corpus?.attacks ?? []).map((a) => [a.id, a.name] as const)
  );

  const results: RuntimeMatchResult[] = [];

  for (const signal of catalog.signals) {
    const evidence = evaluateSignal(session, signal);
    if (evidence.length === 0) continue;

    results.push({
      signalId: signal.id,
      signalName: signal.name,
      attackId: signal.attackId,
      attackName: signal.attackId ? attackNames.get(signal.attackId) : undefined,
      category: signal.category,
      owasp: signal.owasp,
      severity: signal.severity,
      evidence,
    });
  }

  return results.sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return rank[a.severity] - rank[b.severity];
  });
}
