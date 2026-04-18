import { readFileSync, existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { globSync } from "glob";
import type {
  PackageDefinition,
  PromptDefinition,
  ResourceDefinition,
  ScanTarget,
  ToolDefinition,
} from "../types.js";

interface McpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  type?: string;
  headers?: Record<string, string>;
}

interface McpConfigFile {
  mcpServers?: Record<string, McpServerEntry>;
}

interface ServerJsonFile {
  name?: string;
  description?: string;
  version?: string;
  packages?: PackageDefinition[];
  remotes?: Array<{ type?: string; url?: string; tools?: ToolDefinition[] }>;
  _meta?: Record<string, unknown>;
}

function parseJson(path: string): unknown {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

function extractToolsFromMeta(meta: unknown, basePath: string): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  if (!meta || typeof meta !== "object") return tools;

  const walk = (node: unknown, pathPrefix: string) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (item && typeof item === "object" && "name" in item && "description" in item) {
          const t = item as { name: string; description: string; inputSchema?: Record<string, unknown> };
          tools.push({
            name: t.name,
            description: t.description ?? "",
            inputSchema: t.inputSchema,
            sourcePath: `${basePath}.tools[${i}]`,
          });
        }
        walk(item, `${pathPrefix}[${i}]`);
      });
      return;
    }
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      if (key === "tools" && Array.isArray(val)) {
        val.forEach((item, i) => {
          if (item && typeof item === "object" && "name" in item) {
            const t = item as { name: string; description?: string; inputSchema?: Record<string, unknown> };
            tools.push({
              name: t.name,
              description: t.description ?? "",
              inputSchema: t.inputSchema,
              sourcePath: `${basePath}.${key}[${i}]`,
            });
          }
        });
      }
      walk(val, `${pathPrefix}.${key}`);
    }
  };

  walk(meta, basePath);
  return tools;
}

function extractPromptsResources(obj: unknown, basePath: string): {
  prompts: PromptDefinition[];
  resources: ResourceDefinition[];
} {
  const prompts: PromptDefinition[] = [];
  const resources: ResourceDefinition[] = [];

  const addPrompt = (p: Record<string, unknown>, path: string) => {
    if (typeof p.name !== "string") return;
    prompts.push({
      name: p.name,
      description: typeof p.description === "string" ? p.description : "",
      arguments: Array.isArray(p.arguments) ? p.arguments : undefined,
      sourcePath: path,
    });
  };

  const addResource = (r: Record<string, unknown>, path: string) => {
    if (typeof r.name !== "string") return;
    resources.push({
      name: r.name,
      description: typeof r.description === "string" ? r.description : "",
      uri: typeof r.uri === "string" ? r.uri : undefined,
      mimeType: typeof r.mimeType === "string" ? r.mimeType : undefined,
      sourcePath: path,
    });
  };

  const walk = (node: unknown, prefix: string) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${prefix}[${i}]`));
      return;
    }
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      if (key === "prompts" && Array.isArray(val)) {
        val.forEach((item, i) => {
          if (item && typeof item === "object") addPrompt(item as Record<string, unknown>, `${prefix}.prompts[${i}]`);
        });
      }
      if (key === "resources" && Array.isArray(val)) {
        val.forEach((item, i) => {
          if (item && typeof item === "object") addResource(item as Record<string, unknown>, `${prefix}.resources[${i}]`);
        });
      }
      walk(val, `${prefix}.${key}`);
    }
  };

  walk(obj, basePath);
  return { prompts, resources };
}

function loadMcpConfig(path: string): ScanTarget[] {
  const data = parseJson(path) as McpConfigFile;
  const servers = data.mcpServers ?? {};
  const targets: ScanTarget[] = [];

  for (const [name, entry] of Object.entries(servers)) {
    const args = entry.args ?? [];
    const commandLine = [entry.command, ...args].filter(Boolean).join(" ");
    const { prompts, resources } = extractPromptsResources(data, basename(path));

    targets.push({
      serverName: name,
      sourceFile: path,
      sourceKind: "mcp-config",
      tools: [],
      prompts,
      resources,
      packages: inferPackagesFromArgs(args, path, entry.command),
      rawEnv: entry.env ?? {},
      commandLine,
    });
  }

  return targets;
}

function parseNpmIdentifier(raw: string): { identifier: string; version?: string } {
  const full = raw.trim();
  if (full.startsWith("@")) {
    const versionAt = full.indexOf("@", 1);
    if (versionAt > 0) {
      return { identifier: full.slice(0, versionAt), version: full.slice(versionAt + 1) };
    }
    return { identifier: full };
  }
  const versionAt = full.lastIndexOf("@");
  if (versionAt > 0) {
    return { identifier: full.slice(0, versionAt), version: full.slice(versionAt + 1) };
  }
  return { identifier: full };
}

function isPathArg(arg: string): boolean {
  return /^([\/\\~]|\.{1,2}[\/\\]|[A-Za-z]:[\/\\])/.test(arg);
}

function inferPackagesFromArgs(
  args: string[],
  sourcePath: string,
  command?: string
): PackageDefinition[] {
  const packages: PackageDefinition[] = [];
  const joined = [command, ...args].filter(Boolean).join(" ");

  const npxMatch = joined.match(/npx\s+(?:-y\s+)?(@?[\w./-]+(?:@[\w.^~>=<*-]+)?)/);
  if (npxMatch) {
    const { identifier, version } = parseNpmIdentifier(npxMatch[1]);
    packages.push({
      registryType: "npm",
      identifier,
      version,
      sourcePath: `${sourcePath}.args`,
    });
  } else if (command === "npx" || command === "npx.cmd") {
    const pkgArg = args.find((a) => !a.startsWith("-") && !isPathArg(a));
    if (pkgArg) {
      const { identifier, version } = parseNpmIdentifier(pkgArg);
      packages.push({
        registryType: "npm",
        identifier,
        version,
        sourcePath: `${sourcePath}.args`,
      });
    }
  }

  const uvxMatch = joined.match(/uvx\s+([\w.-]+(?:@[\w.^~>=<*-]+)?)/);
  if (uvxMatch) {
    const full = uvxMatch[1];
    const atIdx = full.indexOf("@");
    packages.push({
      registryType: "pypi",
      identifier: atIdx > 0 ? full.slice(0, atIdx) : full,
      version: atIdx > 0 ? full.slice(atIdx + 1) : undefined,
      sourcePath: `${sourcePath}.args`,
    });
  }

  return packages;
}

function loadServerJson(path: string): ScanTarget[] {
  const data = parseJson(path) as ServerJsonFile;
  const name = data.name ?? basename(path, ".json");
  const tools: ToolDefinition[] = [];

  if (data._meta) {
    tools.push(...extractToolsFromMeta(data._meta, "_meta"));
  } else {
    tools.push(...extractToolsFromMeta(data, basename(path)));
  }

  const { prompts, resources } = extractPromptsResources(data, basename(path));

  const packages: PackageDefinition[] = (data.packages ?? []).map((pkg, i) => ({
    ...pkg,
    sourcePath: `${basename(path)}.packages[${i}]`,
  }));

  for (const remote of data.remotes ?? []) {
    if (remote.tools) {
      remote.tools.forEach((t, i) => {
        tools.push({
          ...t,
          sourcePath: `${basename(path)}.remotes.tools[${i}]`,
        });
      });
    }
  }

  return [
    {
      serverName: name,
      sourceFile: path,
      sourceKind: "server-json",
      tools: [...tools],
      prompts,
      resources,
      packages,
      rawEnv: {},
    },
  ];
}

function loadToolsManifest(path: string): ScanTarget[] {
  const data = parseJson(path) as { tools?: ToolDefinition[]; name?: string };
  const tools: ToolDefinition[] = (data.tools ?? []).map((t, i) => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: t.inputSchema,
    sourcePath: `tools[${i}]`,
  }));

  return [
    {
      serverName: data.name ?? basename(path),
      sourceFile: path,
      sourceKind: "tools-manifest",
      tools,
      prompts: [],
      resources: [],
      packages: [],
      rawEnv: {},
    },
  ];
}

function detectKind(path: string, content: unknown): ScanTarget["sourceKind"] {
  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>;
    if ("mcpServers" in obj) return "mcp-config";
    if ("packages" in obj || "$schema" in obj) return "server-json";
    if ("tools" in obj && Array.isArray(obj.tools)) return "tools-manifest";
  }
  if (path.endsWith("server.json")) return "server-json";
  if (path.includes("mcp")) return "mcp-config";
  return "tools-manifest";
}

export function loadTarget(path: string): ScanTarget[] {
  const abs = resolve(path);
  if (!existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }

  const content = parseJson(abs);
  const kind = detectKind(abs, content);

  switch (kind) {
    case "mcp-config":
      return loadMcpConfig(abs);
    case "server-json":
      return loadServerJson(abs);
    case "tools-manifest":
      return loadToolsManifest(abs);
  }
}

export function discoverTargets(inputPath: string): string[] {
  const abs = resolve(inputPath);
  if (!existsSync(abs)) {
    throw new Error(`Path not found: ${abs}`);
  }

  if (statSync(abs).isFile()) {
    return [abs];
  }

  const patterns = [
    "**/mcp.json",
    "**/.mcp.json",
    "**/claude_desktop_config.json",
    "**/server.json",
    "**/tools.json",
  ];

  const files = globSync(patterns, {
    cwd: abs,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  if (files.length === 0) {
    throw new Error(`No MCP config files found under ${abs}`);
  }

  return files;
}

export function loadAll(inputPath: string): ScanTarget[] {
  const files = discoverTargets(inputPath);
  const targets: ScanTarget[] = [];
  for (const file of files) {
    targets.push(...loadTarget(file));
  }
  return targets;
}

export function mergeTargetsByServer(targets: ScanTarget[]): ScanTarget[] {
  const map = new Map<string, ScanTarget>();
  for (const t of targets) {
    const key = `${t.sourceFile}::${t.serverName}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, t);
      continue;
    }
    existing.tools.push(...t.tools);
    existing.prompts.push(...t.prompts);
    existing.resources.push(...t.resources);
    existing.packages.push(...t.packages);
  }
  return [...map.values()];
}
