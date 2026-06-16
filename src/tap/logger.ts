import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { TapLogEvent, TapMessageEvent } from "./types.js";

export class SessionLogger {
  readonly sessionId: string;
  private readonly logPath: string;

  constructor(logPath: string, sessionId?: string) {
    this.logPath = logPath;
    this.sessionId = sessionId ?? randomUUID();
    mkdirSync(dirname(logPath), { recursive: true });
  }

  writeMeta(command: string, args: string[], pid?: number): void {
    const event: TapLogEvent = {
      type: "meta",
      sessionId: this.sessionId,
      startedAt: new Date().toISOString(),
      command,
      args,
      pid,
    };
    appendFileSync(this.logPath, `${JSON.stringify(event)}\n`, "utf-8");
  }

  logMessage(direction: TapMessageEvent["direction"], line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      payload = { parseError: true, raw: trimmed.slice(0, 2000) };
    }

    const method =
      typeof payload.method === "string"
        ? payload.method
        : payload.result !== undefined || payload.error !== undefined
          ? undefined
          : undefined;

    const event: TapMessageEvent = {
      type: "message",
      ts: new Date().toISOString(),
      direction,
      method: typeof payload.method === "string" ? payload.method : undefined,
      id: payload.id as string | number | null | undefined,
      payload,
    };

    appendFileSync(this.logPath, `${JSON.stringify(event)}\n`, "utf-8");
  }
}
