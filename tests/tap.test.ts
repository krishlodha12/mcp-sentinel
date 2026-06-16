import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runForensics, exitCodeForForensics } from "../src/tap/forensics.js";
import { parseSessionLog } from "../src/tap/session.js";
import { loadRuntimeSignals, matchSessionSignals } from "../src/tap/signals.js";
import { readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tapFixtures = resolve(root, "fixtures/tap");

function forensics(fixture: string) {
  return runForensics(resolve(tapFixtures, fixture));
}

describe("session parser", () => {
  it("parses tool calls and pairs responses", () => {
    const session = parseSessionLog(resolve(tapFixtures, "suspicious-session.jsonl"));
    expect(session.sessionId).toBe("demo-suspicious-session");
    expect(session.toolCalls).toHaveLength(2);
    expect(session.toolCalls[0].tool).toBe("run_command");
    expect(session.toolCalls[0].response).toBeDefined();
    expect(session.toolListSnapshots).toHaveLength(2);
  });

  it("counts burst tool calls", () => {
    const session = parseSessionLog(resolve(tapFixtures, "burst-session.jsonl"));
    expect(session.toolCalls).toHaveLength(11);
  });
});

describe("suspicious session forensics", () => {
  let summary: ReturnType<typeof runForensics>;

  it("loads and analyzes suspicious fixture", () => {
    summary = forensics("suspicious-session.jsonl");
    expect(summary.matches.length).toBeGreaterThan(0);
  });

  it("detects shell exfiltration mapped to corpus", () => {
    summary ??= forensics("suspicious-session.jsonl");
    const shell = summary.matches.find((m) => m.attackId === "shell-run-command");
    expect(shell).toBeDefined();
    expect(shell?.severity).toBe("critical");
  });

  it("detects response injection", () => {
    summary ??= forensics("suspicious-session.jsonl");
    const injection = summary.matches.find((m) => m.signalId === "runtime-response-injection");
    expect(injection).toBeDefined();
  });

  it("detects tool-list drift (rug-pull)", () => {
    summary ??= forensics("suspicious-session.jsonl");
    const drift = summary.matches.find((m) => m.signalId === "runtime-tool-drift");
    expect(drift).toBeDefined();
  });

  it("exits non-zero for critical/high", () => {
    summary ??= forensics("suspicious-session.jsonl");
    expect(exitCodeForForensics(summary)).toBe(2);
  });
});

describe("burst session forensics", () => {
  it("detects rapid invocation burst", () => {
    const summary = forensics("burst-session.jsonl");
    const burst = summary.matches.find((m) => m.signalId === "runtime-exfil-burst");
    expect(burst).toBeDefined();
  });
});

describe("clean session forensics", () => {
  it("reports no matches on benign traffic", () => {
    const summary = forensics("clean-session.jsonl");
    expect(summary.matches).toHaveLength(0);
    expect(exitCodeForForensics(summary)).toBe(0);
  });
});

describe("runtime signals catalog", () => {
  it("loads catalog and maps attack names from corpus", () => {
    const session = parseSessionLog(resolve(tapFixtures, "suspicious-session.jsonl"));
    const catalog = loadRuntimeSignals();
    const corpus = JSON.parse(
      readFileSync(resolve(root, "src/replay/corpus/attacks.json"), "utf-8")
    );
    const matches = matchSessionSignals(session, catalog, corpus);
    const shell = matches.find((m) => m.attackId === "shell-run-command");
    expect(shell?.attackName).toBe("Shell command execution");
  });
});
