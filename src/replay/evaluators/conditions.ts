import type { ScanTarget } from "../../scanner/types.js";
import type {
  AgentConfig,
  ExploitCondition,
  ReplayAttack,
  ReplayEvidence,
} from "../types.js";
import type { ScanSummary } from "../../scanner/types.js";
import { severityRank } from "../../scanner/types.js";

export interface EvaluationContext {
  agent: AgentConfig;
  targets: ScanTarget[];
  staticScan: ScanSummary;
  attack: ReplayAttack;
}

function regex(pattern: string, flags?: string): RegExp {
  return new RegExp(pattern, flags ?? "i");
}

function lastTurn(attack: ReplayAttack): string {
  return attack.turns[attack.turns.length - 1] ?? "";
}

function allTurns(attack: ReplayAttack): string {
  return attack.turns.join("\n");
}

function findTool(targets: ScanTarget[], name: string) {
  for (const t of targets) {
    const tool = t.tools.find((x) => x.name === name);
    if (tool) return { tool, server: t.serverName };
  }
  return undefined;
}

function findPrompt(targets: ScanTarget[], name: string) {
  for (const t of targets) {
    const prompt = t.prompts.find((x) => x.name === name);
    if (prompt) return { prompt, server: t.serverName };
  }
  return undefined;
}

function findResource(targets: ScanTarget[], name: string) {
  for (const t of targets) {
    const resource = t.resources.find((x) => x.name === name);
    if (resource) return { resource, server: t.serverName };
  }
  return undefined;
}

function hasWeakSystemPrompt(agent: AgentConfig): boolean {
  const p = agent.systemPrompt.toLowerCase();
  const safety = [
    "safety",
    "refuse",
    "do not follow",
    "ignore tool",
    "verify",
    "untrusted",
    "never execute",
  ];
  return !safety.some((word) => p.includes(word));
}

export function evaluateCondition(
  condition: ExploitCondition,
  ctx: EvaluationContext
): { matched: boolean; evidence: ReplayEvidence[] } {
  switch (condition.type) {
    case "all": {
      const nested = condition.conditions ?? [];
      const evidence: ReplayEvidence[] = [];
      for (const c of nested) {
        const r = evaluateCondition(c, ctx);
        if (!r.matched) return { matched: false, evidence: [] };
        evidence.push(...r.evidence);
      }
      return { matched: nested.length > 0, evidence };
    }
    case "any": {
      const nested = condition.conditions ?? [];
      for (const c of nested) {
        const r = evaluateCondition(c, ctx);
        if (r.matched) return r;
      }
      return { matched: false, evidence: [] };
    }
    case "scan-finding": {
      const min = condition.minSeverity ?? "info";
      const finding = ctx.staticScan.findings.find(
        (f) =>
          f.checkId === condition.checkId &&
          severityRank(f.severity) <= severityRank(min)
      );
      if (!finding) return { matched: false, evidence: [] };
      return {
        matched: true,
        evidence: [
          {
            kind: "finding",
            message: `${finding.title} (${finding.severity})`,
            location: finding.location,
          },
        ],
      };
    }
    case "agent-policy": {
      if (!condition.policy) return { matched: false, evidence: [] };
      const actual = ctx.agent.policies[condition.policy];
      const expected = condition.value;
      const matched =
        typeof expected === "boolean"
          ? actual === expected
          : String(actual) === String(expected);
      if (!matched) return { matched: false, evidence: [] };
      return {
        matched: true,
        evidence: [
          {
            kind: "policy",
            message: `Agent policy ${condition.policy}=${String(actual)}`,
          },
        ],
      };
    }
    case "tool-present": {
      const hit = findTool(ctx.targets, condition.name ?? condition.tool ?? "");
      if (!hit) return { matched: false, evidence: [] };
      return {
        matched: true,
        evidence: [
          {
            kind: "tool",
            message: `Tool "${hit.tool.name}" exposed on ${hit.server}`,
            location: hit.tool.sourcePath,
          },
        ],
      };
    }
    case "tool-description-contains": {
      const hit = findTool(ctx.targets, condition.tool ?? condition.name ?? "");
      if (!hit || !condition.pattern) return { matched: false, evidence: [] };
      if (!regex(condition.pattern, condition.flags).test(hit.tool.description)) {
        return { matched: false, evidence: [] };
      }
      return {
        matched: true,
        evidence: [
          {
            kind: "tool",
            message: `Tool "${hit.tool.name}" description matches /${condition.pattern}/`,
            location: hit.tool.sourcePath,
          },
        ],
      };
    }
    case "prompt-description-contains": {
      const hit = findPrompt(ctx.targets, condition.name ?? "");
      if (!hit || !condition.pattern) return { matched: false, evidence: [] };
      if (!regex(condition.pattern, condition.flags).test(hit.prompt.description)) {
        return { matched: false, evidence: [] };
      }
      return {
        matched: true,
        evidence: [
          {
            kind: "prompt",
            message: `Prompt "${hit.prompt.name}" matches /${condition.pattern}/`,
            location: hit.prompt.sourcePath,
          },
        ],
      };
    }
    case "resource-description-contains": {
      const hit = findResource(ctx.targets, condition.name ?? "");
      if (!hit || !condition.pattern) return { matched: false, evidence: [] };
      if (
        !regex(condition.pattern, condition.flags).test(hit.resource.description)
      ) {
        return { matched: false, evidence: [] };
      }
      return {
        matched: true,
        evidence: [
          {
            kind: "resource",
            message: `Resource "${hit.resource.name}" matches /${condition.pattern}/`,
            location: hit.resource.sourcePath,
          },
        ],
      };
    }
    case "attack-turn-matches": {
      if (!condition.pattern) return { matched: false, evidence: [] };
      const text =
        condition.flags?.includes("m") || ctx.attack.turns.length > 1
          ? allTurns(ctx.attack)
          : lastTurn(ctx.attack);
      if (!regex(condition.pattern, condition.flags).test(text)) {
        return { matched: false, evidence: [] };
      }
      return {
        matched: true,
        evidence: [
          {
            kind: "attack",
            message: `Attack text matches /${condition.pattern}/`,
          },
        ],
      };
    }
    case "system-prompt-weak": {
      if (!hasWeakSystemPrompt(ctx.agent)) return { matched: false, evidence: [] };
      return {
        matched: true,
        evidence: [
          {
            kind: "policy",
            message: "System prompt lacks explicit safety boundaries",
          },
        ],
      };
    }
    case "remote-http": {
      const http = ctx.targets.some((t) =>
        t.remoteUrls.some((u) => u.startsWith("http://"))
      );
      if (!http) return { matched: false, evidence: [] };
      const url = ctx.targets.flatMap((t) => t.remoteUrls).find((u) => u.startsWith("http://"));
      return {
        matched: true,
        evidence: [
          {
            kind: "transport",
            message: `Insecure HTTP remote: ${url ?? "unknown"}`,
          },
        ],
      };
    }
    default:
      return { matched: false, evidence: [] };
  }
}

export function attackExploited(ctx: EvaluationContext): {
  exploited: boolean;
  evidence: ReplayEvidence[];
} {
  const evidence: ReplayEvidence[] = [];
  for (const condition of ctx.attack.exploitWhen) {
    const r = evaluateCondition(condition, ctx);
    if (!r.matched) return { exploited: false, evidence: [] };
    evidence.push(...r.evidence);
  }
  return { exploited: true, evidence };
}
