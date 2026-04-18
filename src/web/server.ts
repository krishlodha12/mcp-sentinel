import express from "express";
import multer from "multer";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import open from "open";
import { loadTarget } from "../scanner/loaders/config-loader.js";
import { runChecks } from "../scanner/engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(publicDir));

app.get("/api/checks", (_req, res) => {
  res.json({
    checks: [
      { id: "hidden-instructions", name: "Hidden instruction detection" },
      { id: "base64-payload", name: "Base64 payload detection" },
      { id: "command-injection", name: "Command injection surface" },
      { id: "broad-permissions", name: "Over-broad permissions" },
      { id: "unpinned-versions", name: "Unpinned package versions" },
      { id: "cve-patterns", name: "Known CVE patterns" },
      { id: "secrets-in-config", name: "Hardcoded secrets" },
      { id: "prompt-resource-poisoning", name: "Prompt & resource poisoning" },
    ],
  });
});

app.post("/api/scan", upload.single("file"), (req, res) => {
  try {
    let jsonText: string;

    if (req.file) {
      jsonText = req.file.buffer.toString("utf-8");
    } else if (req.body?.content) {
      jsonText = req.body.content;
    } else if (req.body?.path) {
      if (!existsSync(req.body.path)) {
        res.status(400).json({ error: "Path not found on server" });
        return;
      }
      jsonText = readFileSync(req.body.path, "utf-8");
    } else {
      res.status(400).json({ error: "Send a JSON file, content body, or path" });
      return;
    }

    const tmpPath = join(__dirname, "_upload.json");
    writeFileSync(tmpPath, jsonText);
    const targets = loadTarget(tmpPath);
    const summary = runChecks(targets);
    unlinkSync(tmpPath);

    res.json(summary);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Scan failed",
    });
  }
});

app.get("/api/demo", (_req, res) => {
  const demoPath = join(__dirname, "../../fixtures/vulnerable-setup/mcp.json");
  if (!existsSync(demoPath)) {
    res.status(404).json({ error: "Demo fixture missing" });
    return;
  }
  const targets = loadTarget(demoPath);
  res.json(runChecks(targets));
});

const port = Number(process.env.PORT ?? 3847);

app.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`MCP Sentinel UI → ${url}`);
  if (process.env.NO_OPEN !== "1") {
    open(url).catch(() => {});
  }
});
