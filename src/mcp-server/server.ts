import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  handleDecoyAgentFixture,
  handleListSecurityChecks,
  handleMutateAgentFixture,
  handleProbeMcpConfig,
  handleReplayAgentFixture,
  handleScanMcpConfig,
  handleTwinFleetFixture,
} from "./handlers.js";

function toolJson(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

export function createMcpServer() {
  const server = new McpServer({
    name: "mcp-sentinel",
    version: "0.1.0",
  });

  server.registerTool(
    "scan_mcp_config",
    {
      description:
        "Static security scan of MCP config files (tool poisoning, secrets, supply chain, permissions). Provide a filesystem path or raw config_json.",
      inputSchema: {
        path: z
          .string()
          .optional()
          .describe("Path to mcp.json, server.json, tools manifest, or directory to scan"),
        config_json: z
          .string()
          .optional()
          .describe("Raw MCP config JSON when no file path is available"),
        min_severity: z
          .enum(["critical", "high", "medium", "low", "info"])
          .optional()
          .describe("Only return findings at or above this severity"),
        include_info: z
          .boolean()
          .optional()
          .describe("Include informational findings (default true)"),
      },
    },
    async (args) => {
      try {
        if (!args.path && !args.config_json) {
          return toolError("Provide path or config_json.");
        }
        return toolJson(await handleScanMcpConfig(args));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "probe_mcp_config",
    {
      description:
        "Live probe: spawn local MCP servers from a config, list runtime tools, and compare to the static scan (drift detection).",
      inputSchema: {
        path: z
          .string()
          .describe("Path to mcp.json or directory containing mcp.json"),
        allow_remote: z
          .boolean()
          .optional()
          .describe("Allow remote URL server entries (default false)"),
        allow_any_package: z
          .boolean()
          .optional()
          .describe("Allow packages outside @modelcontextprotocol/* (default false)"),
        timeout_ms: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Per-server connect timeout in ms (default 45000)"),
      },
    },
    async (args) => {
      try {
        return toolJson(await handleProbeMcpConfig(args));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "list_security_checks",
    {
      description: "List all MCP Sentinel static security checks and what they detect.",
      inputSchema: {},
    },
    async () => {
      try {
        return toolJson(handleListSecurityChecks());
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "replay_agent_fixture",
    {
      description:
        "Run the attack corpus against an agent fixture in a sandbox and report exploited vs blocked attacks.",
      inputSchema: {
        path: z
          .string()
          .describe("Agent fixture directory containing agent.json and MCP configs"),
        live: z
          .boolean()
          .optional()
          .describe("Merge live MCP runtime tools before replay (default false)"),
        allow_any_package: z
          .boolean()
          .optional()
          .describe("When live=true, allow non-official packages during probe"),
      },
    },
    async (args) => {
      try {
        return toolJson(await handleReplayAgentFixture(args));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "mutate_agent_fixture",
    {
      description:
        "Plan policy/prompt hardening from replay exploit evidence and re-run corpus for before/after score.",
      inputSchema: {
        path: z.string().describe("Agent fixture directory containing agent.json"),
      },
    },
    async (args) => {
      try {
        return toolJson(handleMutateAgentFixture(args));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "decoy_agent_fixture",
    {
      description:
        "Route exploited attacks to ghost honeypot tools while hardening the real agent path (AICON simulation).",
      inputSchema: {
        path: z.string().describe("Agent fixture directory containing agent.json"),
      },
    },
    async (args) => {
      try {
        return toolJson(handleDecoyAgentFixture(args));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  server.registerTool(
    "twin_fleet_fixture",
    {
      description:
        "Closed-loop fleet simulation: probe agents, share intel, cross-harden, fleet decoy, and verify.",
      inputSchema: {
        path: z.string().describe("Fleet fixture directory containing fleet.json"),
      },
    },
    async (args) => {
      try {
        return toolJson(handleTwinFleetFixture(args));
      } catch (err) {
        return toolError(err instanceof Error ? err.message : String(err));
      }
    }
  );

  return server;
}

export async function startMcpServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
