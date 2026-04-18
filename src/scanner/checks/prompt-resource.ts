import type { Finding, ScanTarget, SecurityCheck } from "../types.js";
import { owasp } from "../../owasp/mapping.js";
import { makeFindingId } from "../utils.js";
import { hiddenInstructionsCheck } from "./hidden-instructions.js";

/** Most scanners ignore prompts/resources — we run the same text checks on them. */
export const promptResourceCheck: SecurityCheck = {
  id: "prompt-resource-coverage",
  name: "Prompt and resource poisoning",
  description: "Ensures prompts/resources are present and scanned (gap in most MCP scanners).",
  run(target: ScanTarget): Finding[] {
    const findings: Finding[] = [];

    if (target.prompts.length === 0 && target.resources.length === 0) {
      findings.push({
        id: makeFindingId(),
        checkId: "prompt-resource-coverage",
        title: "No prompts or resources declared",
        severity: "info",
        owasp: owasp("ASI06"),
        serverName: target.serverName,
        location: target.sourceFile,
        message:
          "This config only exposes tools (or launch metadata). If the live server registers prompts/resources at runtime, static scan cannot see them — fetch server.json from registry or export tools manifest.",
        remediation:
          "Add server.json with full tool/prompt/resource metadata to your scan path, or use mcp-sentinel on exported manifests.",
        explanation:
          "Tool poisoning also applies to MCP Prompts and Resources. Runtime-only registration bypasses config-only review unless you scan exported manifests.",
        references: ["https://modelcontextprotocol.io/docs/concepts/prompts"],
      });
      return findings;
    }

    const poisonFindings = hiddenInstructionsCheck.run({
      ...target,
      tools: [],
    });

    for (const f of poisonFindings) {
      findings.push({
        ...f,
        checkId: "prompt-resource-poisoning",
        owasp: owasp("ASI06"),
      });
    }

    return findings;
  },
};
