import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { loadAll } from "../scanner/loaders/config-loader.js";
import { runChecks } from "../scanner/engine.js";
import type { AgentConfig, SandboxSession } from "./types.js";

function copyDir(src: string, dest: string): void {
  cpSync(src, dest, { recursive: true });
}

function loadAgentConfig(agentDir: string): AgentConfig {
  const path = join(agentDir, "agent.json");
  if (!existsSync(path)) {
    throw new Error(`Missing agent.json in ${agentDir}`);
  }
  const raw = JSON.parse(readFileSync(path, "utf-8")) as AgentConfig;
  if (!raw.name || !raw.systemPrompt || !raw.policies || !raw.mcpPaths?.length) {
    throw new Error(`Invalid agent.json in ${agentDir}`);
  }
  return raw;
}

function resolveMcpInputs(agentDir: string, agent: AgentConfig): string[] {
  return agent.mcpPaths.map((p) => resolve(agentDir, p));
}

export function createSandbox(agentFixturePath: string): SandboxSession {
  const agentDir = resolve(agentFixturePath);
  if (!existsSync(agentDir) || !statSync(agentDir).isDirectory()) {
    throw new Error(`Agent fixture directory not found: ${agentDir}`);
  }

  const agent = loadAgentConfig(agentDir);
  const sandboxPath = mkdtempSync(join(tmpdir(), "mcp-sentinel-replay-"));
  copyDir(agentDir, sandboxPath);

  const sandboxAgentPath = join(sandboxPath, "agent.json");
  const sandboxAgent = JSON.parse(
    readFileSync(sandboxAgentPath, "utf-8")
  ) as AgentConfig;

  const mcpInputs = sandboxAgent.mcpPaths.map((p) => resolve(sandboxPath, p));
  for (const input of mcpInputs) {
    if (!existsSync(input)) {
      throw new Error(
        `MCP path missing in sandbox: ${input} (from agent ${basename(agentDir)})`
      );
    }
  }

  const targets = mcpInputs.flatMap((input) => {
    if (statSync(input).isDirectory()) return loadAll(input);
    return loadAll(input);
  });

  const staticScan = runChecks(targets);

  return {
    path: sandboxPath,
    agent: sandboxAgent,
    targets,
    staticScan,
    cleanup: () => {
      try {
        rmSync(sandboxPath, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    },
  };
}

export function discoverAgentFixture(pathArg: string): string {
  const abs = resolve(pathArg);
  if (!existsSync(abs)) {
    throw new Error(`Path not found: ${abs}`);
  }
  if (statSync(abs).isFile()) {
    return dirname(abs);
  }
  if (existsSync(join(abs, "agent.json"))) {
    return abs;
  }
  throw new Error(`No agent.json found under ${abs}`);
}
