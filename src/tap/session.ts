import { readFileSync } from "node:fs";
import type {
  ParsedSession,
  ParsedToolCall,
  TapLogEvent,
  TapMessageEvent,
  ToolListSnapshot,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function jsonRpcId(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
}

function extractToolCalls(events: TapMessageEvent[]): ParsedToolCall[] {
  const pending = new Map<string | number, ParsedToolCall>();
  const calls: ParsedToolCall[] = [];
  let index = 0;

  for (const event of events) {
    const payload = event.payload;
    if (payload.method === "tools/call") {
      const params = asRecord(payload.params);
      const tool = typeof params?.name === "string" ? params.name : "unknown";
      const args = params?.arguments;
      const id = jsonRpcId(payload.id);
      const call: ParsedToolCall = {
        index: index++,
        ts: event.ts,
        requestId: id,
        tool,
        args,
      };
      calls.push(call);
      if (id !== undefined) pending.set(id, call);
      continue;
    }

    if (payload.result !== undefined || payload.error !== undefined) {
      const id = jsonRpcId(payload.id);
      if (id === undefined) continue;
      const call = pending.get(id);
      if (!call) continue;
      call.response = payload.result ?? payload.error;
      call.responseTs = event.ts;
      pending.delete(id);
    }
  }

  return calls;
}

function extractToolListSnapshots(events: TapMessageEvent[]): ToolListSnapshot[] {
  const snapshots: ToolListSnapshot[] = [];

  for (const event of events) {
    const payload = event.payload;
    const result = asRecord(payload.result);
    const toolsRaw = result?.tools;
    if (!Array.isArray(toolsRaw)) continue;

    const tools = toolsRaw
      .map((t) => asRecord(t))
      .filter((t): t is Record<string, unknown> => !!t)
      .map((t) => ({
        name: typeof t.name === "string" ? t.name : "unknown",
        description: typeof t.description === "string" ? t.description : "",
      }));

    snapshots.push({ ts: event.ts, tools });
  }

  return snapshots;
}

export function parseSessionLog(path: string): ParsedSession {
  const lines = readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let sessionId = "unknown";
  let startedAt = new Date(0).toISOString();
  let command = "";
  let args: string[] = [];
  const events: TapMessageEvent[] = [];

  for (const line of lines) {
    const parsed = JSON.parse(line) as TapLogEvent;
    if (parsed.type === "meta") {
      sessionId = parsed.sessionId;
      startedAt = parsed.startedAt;
      command = parsed.command;
      args = parsed.args;
      continue;
    }
    if (parsed.type === "message") {
      events.push(parsed);
    }
  }

  return {
    sessionId,
    startedAt,
    command,
    args,
    events,
    toolCalls: extractToolCalls(events),
    toolListSnapshots: extractToolListSnapshots(events),
  };
}
