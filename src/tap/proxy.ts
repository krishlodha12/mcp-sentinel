import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { resolveNpxCommand } from "../live/mcp-config.js";
import { SessionLogger } from "./logger.js";
import type { TapOptions } from "./types.js";

function relayLines(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  onLine: (line: string) => void
): void {
  const rl = createInterface({ input, crlfDelay: Infinity });
  rl.on("line", (line) => {
    onLine(line);
    output.write(`${line}\n`);
  });
}

export function runTapProxy(options: TapOptions): Promise<number> {
  const logger = new SessionLogger(options.logPath, options.sessionId);
  const command = resolveNpxCommand(options.command);

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  if (options.env) Object.assign(env, options.env);

  const child = spawn(command, options.args, {
    stdio: ["pipe", "pipe", "pipe"],
    env,
    shell: process.platform === "win32",
  });

  logger.writeMeta(command, options.args, child.pid);

  if (!child.stdin || !child.stdout) {
    return Promise.reject(new Error("Failed to create upstream stdio pipes"));
  }

  relayLines(process.stdin, child.stdin, (line) => logger.logMessage("client", line));
  relayLines(child.stdout, process.stdout, (line) => logger.logMessage("server", line));

  child.stderr?.pipe(process.stderr);

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) {
        reject(new Error(`Upstream exited via signal ${signal}`));
        return;
      }
      resolve(code ?? 0);
    });
  });
}
