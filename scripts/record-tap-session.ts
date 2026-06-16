#!/usr/bin/env tsx
/**
 * Record a minimal real MCP session through tap (for demo / forensics verify).
 * Writes C:/Users/krish/mcp-session.jsonl by default.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveNpxCommand } from "../src/live/mcp-config.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const logPath = process.env.MCP_TAP_LOG ?? "C:/Users/krish/mcp-session.jsonl";

const distCli = resolve(root, "dist/cli.js");
const srcCli = resolve(root, "src/cli.ts");
const useDist = existsSync(distCli);
const tapCommand = process.execPath;
const tapArgs = useDist
  ? [distCli, "tap", "--log", logPath, "--session-id", "demo-live-memory", "--"]
  : [
      resolve(root, "node_modules/tsx/dist/cli.mjs"),
      srcCli,
      "tap",
      "--log",
      logPath,
      "--session-id",
      "demo-live-memory",
      "--",
    ];

const npx = resolveNpxCommand("npx");
tapArgs.push(npx, "-y", "@modelcontextprotocol/server-memory@2026.1.26");

const transport = new StdioClientTransport({
  command: tapCommand,
  args: tapArgs,
  cwd: root,
  stderr: "pipe",
});

const client = new Client({ name: "mcp-sentinel-record", version: "0.1.0" });

try {
  console.log(`Recording session → ${logPath}`);
  await client.connect(transport);
  const tools = await client.listTools();
  console.log(`Connected. Runtime tools: ${tools.tools?.length ?? 0}`);
  if (tools.tools?.[0]) {
    console.log(`First tool: ${tools.tools[0].name}`);
  }
} finally {
  try {
    await client.close();
  } catch {
    /* best effort */
  }
}

console.log(`Done. Run: npm run forensics -- ${logPath}`);
