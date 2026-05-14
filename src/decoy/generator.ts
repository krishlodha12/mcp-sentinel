import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import type { SandboxSession } from "../replay/types.js";
import type { GhostTool, GhostToolCatalog } from "./types.js";

const DEFAULT_CATALOG = join(
  dirname(fileURLToPath(import.meta.url)),
  "catalog.json"
);

export function loadCatalog(path?: string): GhostToolCatalog {
  const catalogPath = path ?? DEFAULT_CATALOG;
  const raw = JSON.parse(readFileSync(catalogPath, "utf-8")) as GhostToolCatalog;
  if (!raw.tools?.length) {
    throw new Error(`Ghost tool catalog empty or invalid: ${catalogPath}`);
  }
  return raw;
}

function ghostToolsManifest(tools: GhostTool[]): Record<string, unknown> {
  return {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string", description: "Resource or path to act on" },
          payload: { type: "string", description: "Optional payload or command" },
        },
      },
      _decoy: { kind: t.kind, category: t.category, owasp: t.owasp },
    })),
  };
}

export interface DecoySandbox {
  path: string;
  ghostTools: GhostTool[];
  cleanup: () => void;
}

/** Copy the weak agent sandbox and inject AICON ghost tools as a decoy MCP surface. */
export function buildDecoySandbox(
  source: SandboxSession,
  catalog: GhostToolCatalog
): DecoySandbox {
  const decoyPath = mkdtempSync(join(tmpdir(), "mcp-sentinel-decoy-"));
  cpSync(source.path, decoyPath, { recursive: true });

  const manifestPath = join(decoyPath, "decoy-tools.json");
  writeFileSync(manifestPath, JSON.stringify(ghostToolsManifest(catalog.tools), null, 2));

  const agentPath = join(decoyPath, "agent.json");
  const agent = JSON.parse(readFileSync(agentPath, "utf-8")) as {
    mcpPaths: string[];
    name: string;
    description?: string;
  };
  if (!agent.mcpPaths.includes("./decoy-tools.json")) {
    agent.mcpPaths = [...agent.mcpPaths, "./decoy-tools.json"];
    agent.description = `${agent.description ?? agent.name} [AICON decoy path]`;
    writeFileSync(agentPath, JSON.stringify(agent, null, 2));
  }

  return {
    path: decoyPath,
    ghostTools: catalog.tools,
    cleanup: () => {
      try {
        rmSync(decoyPath, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    },
  };
}

export { DEFAULT_CATALOG };
