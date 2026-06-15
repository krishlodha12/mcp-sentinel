import { describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  handleListSecurityChecks,
  handleScanMcpConfig,
  materializeConfigPath,
} from "../src/mcp-server/handlers.js";
import { createMcpServer } from "../src/mcp-server/server.js";

const root = join(import.meta.dirname, "..");
const cleanSetup = join(root, "fixtures/clean-setup");

describe("mcp-server handlers", () => {
  it("lists security checks", () => {
    const checks = handleListSecurityChecks();
    expect(checks.length).toBeGreaterThanOrEqual(10);
    expect(checks[0]).toHaveProperty("id");
    expect(checks[0]).toHaveProperty("name");
  });

  it("scans a fixture path", async () => {
    const result = await handleScanMcpConfig({ path: cleanSetup });
    expect(result.serversScanned).toBeGreaterThan(0);
    expect(result.bySeverity).toBeDefined();
  });

  it("scans inline config_json", async () => {
    const path = materializeConfigPath(
      undefined,
      JSON.stringify({ mcpServers: {} })
    );
    const result = await handleScanMcpConfig({ path });
    expect(result.serversScanned).toBe(0);
  });
});

describe("mcp-server registration", () => {
  it("registers sentinel tools", () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });
});
