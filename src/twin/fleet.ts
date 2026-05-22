import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { FleetAgentRef, FleetConfig } from "./types.js";

export function loadFleet(fleetPath: string): { config: FleetConfig; dir: string } {
  const abs = resolve(fleetPath);
  if (!existsSync(abs)) {
    throw new Error(`Fleet path not found: ${abs}`);
  }

  let dir = abs;
  let configPath = join(abs, "fleet.json");

  if (statSync(abs).isFile()) {
    dir = resolve(abs, "..");
    configPath = abs;
  }

  if (!existsSync(configPath)) {
    throw new Error(`Missing fleet.json in ${dir}`);
  }

  const config = JSON.parse(readFileSync(configPath, "utf-8")) as FleetConfig;
  if (!config.name || !config.agents?.length) {
    throw new Error(`Invalid fleet.json in ${dir}`);
  }

  for (const agent of config.agents) {
    if (!agent.id || !agent.path) {
      throw new Error(`Invalid agent entry in fleet ${config.name}`);
    }
    const agentDir = resolveAgentPath(dir, agent);
    if (!existsSync(join(agentDir, "agent.json"))) {
      throw new Error(`Missing agent.json for fleet agent ${agent.id}: ${agentDir}`);
    }
  }

  return { config, dir };
}

export function resolveAgentPath(fleetDir: string, agent: FleetAgentRef): string {
  return resolve(fleetDir, agent.path);
}
