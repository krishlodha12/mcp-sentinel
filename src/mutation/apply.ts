import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentConfig, AgentPolicies } from "../replay/types.js";
import type { Mutation, PlannedMutation } from "./types.js";

function applyToAgent(agent: AgentConfig, plan: PlannedMutation): AgentConfig {
  const next = { ...agent, policies: { ...agent.policies } };

  switch (plan.kind) {
    case "policy": {
      const key = plan.field as keyof AgentPolicies;
      const value = plan.after as AgentPolicies[typeof key];
      next.policies = { ...next.policies, [key]: value };
      break;
    }
    case "system-prompt":
      next.systemPrompt = String(plan.after);
      break;
    case "recommendation":
      break;
  }

  return next;
}

export function applyMutations(
  agent: AgentConfig,
  plans: PlannedMutation[]
): { agent: AgentConfig; mutations: Mutation[] } {
  let current = { ...agent, policies: { ...agent.policies } };
  const mutations: Mutation[] = [];

  for (const plan of plans) {
    if (plan.kind === "recommendation") {
      mutations.push({ ...plan });
      continue;
    }

    const beforeApply = current;
    current = applyToAgent(current, plan);
    if (
      plan.kind === "policy" &&
      beforeApply.policies[plan.field as keyof AgentPolicies] ===
        current.policies[plan.field as keyof AgentPolicies]
    ) {
      continue;
    }
    if (plan.kind === "system-prompt" && beforeApply.systemPrompt === current.systemPrompt) {
      continue;
    }

    mutations.push({ ...plan });
  }

  return { agent: current, mutations };
}

export function persistAgent(sandboxPath: string, agent: AgentConfig): void {
  writeFileSync(join(sandboxPath, "agent.json"), JSON.stringify(agent, null, 2) + "\n", "utf-8");
}
