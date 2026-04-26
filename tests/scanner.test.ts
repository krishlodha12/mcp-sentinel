import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTarget, loadAll } from "../src/scanner/loaders/config-loader.js";
import { runChecks } from "../src/scanner/engine.js";
import { hiddenInstructionsCheck } from "../src/scanner/checks/hidden-instructions.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("config loader", () => {
  it("loads mcp.json servers", () => {
    const targets = loadTarget(resolve(root, "fixtures/vulnerable-setup/mcp.json"));
    expect(targets.length).toBeGreaterThan(0);
    expect(targets[0].serverName).toBe("filesystem");
    expect(targets[0].packages.length).toBeGreaterThan(0);
  });

  it("loads server.json tools from _meta", () => {
    const targets = loadTarget(resolve(root, "fixtures/vulnerable-setup/server.json"));
    expect(targets[0].tools.length).toBeGreaterThanOrEqual(3);
    expect(targets[0].prompts.length).toBe(1);
  });
});

describe("hidden instructions", () => {
  it("detects zero-width characters", () => {
    const target = {
      serverName: "test",
      sourceFile: "x.json",
      sourceKind: "tools-manifest" as const,
      tools: [
        {
          name: "t",
          description: "Safe text\u200Bhidden",
          sourcePath: "tools[0]",
        },
      ],
      prompts: [],
      resources: [],
      packages: [],
      rawEnv: {},
      remoteUrls: [],
    };
    const findings = hiddenInstructionsCheck.run(target);
    expect(findings.some((f) => f.checkId === "hidden-instructions")).toBe(true);
  });
});

describe("full scan", () => {
  it("finds multiple issues in vulnerable fixture", () => {
    const targets = loadTarget(resolve(root, "fixtures/vulnerable-setup/server.json"));
    const summary = runChecks(targets);
    expect(summary.findings.length).toBeGreaterThan(3);
    expect(summary.bySeverity.critical + summary.bySeverity.high).toBeGreaterThan(0);
  });

  it("returns no critical/high/medium on clean mirror fixtures", () => {
    const targets = loadAll(resolve(root, "fixtures/clean-setup"));
    const summary = runChecks(targets, { includeInfo: false });
    const bad = summary.findings.filter((f) =>
      ["critical", "high", "medium"].includes(f.severity)
    );
    expect(bad.length).toBe(0);
  });
});
