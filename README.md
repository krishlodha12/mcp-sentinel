# MCP Sentinel

A security toolkit for [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) setup files.

MCP lets apps like Cursor or Claude Desktop connect to extra tools (read files, run commands, search the web, and so on). Those connections are configured in JSON files on your machine. MCP Sentinel reads those files **before** you connect anything and warns you about common mistakes: hidden instructions in tool descriptions, packages that always fetch the latest version, folders opened too broadly, API keys sitting in plain text, and similar issues.

Think of it as a lint check for MCP configs — not a guarantee nothing bad can happen, but a fast way to catch obvious problems.

**Built over ~8 weeks (April–June 2026)** — see [CHANGELOG.md](CHANGELOG.md) for the week-by-week timeline.

---

## What is this project?

| Piece | What it does (plain English) |
|-------|------------------------------|
| **Scan** | Read your MCP config files and list security warnings |
| **Replay** | Run a fixed set of 25 “bad prompts” against a sample setup in a temp folder and see what would get through |
| **Mutate** | Suggest tighter rules in the sample config, then replay again to show before/after |
| **Decoy** | Route suspicious traffic to fake “honeypot” tools while hardening the real setup |
| **Twin** | Same idea across several MCP servers sharing what they learned |
| **Probe** | Start real official MCP servers locally, list what tools they expose at runtime, and compare that to the static config |
| **Web UI** | Browser dashboard for scan and live probe |

Everything runs locally on your machine. No cloud service required.

---

## What the scanner looks for

| Check | Why it matters |
|-------|----------------|
| Hidden text | Invisible Unicode or HTML comments hiding extra instructions |
| Encoded payloads | Base64 blobs that decode to instructions |
| Risky commands | Shell tools or launch patterns that could run arbitrary code |
| Wide file access | Configs that expose your whole home folder or drive |
| Unpinned packages | `npx -y` without a fixed version — npm can change what gets installed |
| Known bad packages | Curated list of packages with public security advisories |
| Secrets in JSON | API keys and tokens stored in config files |
| Poisoned prompts | Same hidden-text checks on prompt and resource fields |

Findings are grouped using the [OWASP Top 10 for Agentic Applications (2026)](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) — a standard checklist for tool-connected apps (including ones that use large language models).

---

## Quick start

**Requirements:** Node.js 18+

```bash
cd mcp-sentinel
npm install
npm test
```

### Scan a config

```bash
npm run scan -- fixtures/vulnerable-setup
npm run scan -- path/to/your/mcp.json --output report.json
```

Exit codes for CI: `0` = clean enough, `1` = high findings, `2` = critical.

### Web UI

```bash
npm run ui
```

Open `http://localhost:3847`. Upload a config, paste JSON, or run the bundled demo scan.

### Windows

If `npm` is not found after setup, restart the terminal or run:

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
.\run.ps1 scan fixtures/vulnerable-setup
```

---

## Supported config files

- `mcp.json` / `.mcp.json`
- `claude_desktop_config.json`
- `server.json` (MCP registry format)
- `tools.json` (exported tool lists)

---

## How the project grew (5 steps + live probe)

Work happened in phases over two months. Each phase has test fixtures: one broken on purpose, one clean, and one based on a real public security case.

### Step 1 — Static scanner (April 2026)

Reads JSON configs and runs 10 checks. Includes a web UI and CLI.

```bash
npm run scan -- fixtures/clean-setup
```

Fixtures: `fixtures/vulnerable-setup/`, `fixtures/clean-setup/`, `fixtures/real-world/` (CVE-2025-6514).

### Step 2 — Replay harness (early May 2026)

Copies a sample agent setup into a temp folder, scans it, then runs 25 scripted attacks (injection, jailbreak-style prompts, data exfiltration patterns).

```bash
npm run replay -- fixtures/replay/vulnerable-agent
npm run replay -- fixtures/replay/clean-agent
```

Fixtures under `fixtures/replay/`. Details: `fixtures/REPLAY_MATRIX.md`.

### Step 3 — Auto hardening (mid May 2026)

Uses replay results to tighten sample policies and system prompts, then replays again for a before/after score.

```bash
npm run mutate -- fixtures/replay/vulnerable-agent
```

Details: `fixtures/MUTATION_MATRIX.md`.

### Step 4 — Decoy tools (late May 2026)

When an attack would succeed, send it to fake MCP tools (honeypots) instead of the real ones. The real path gets the Step 3 hardening.

```bash
npm run decoy -- fixtures/replay/vulnerable-agent
```

Details: `fixtures/DECOY_MATRIX.md`.

### Step 5 — Fleet mode (late May 2026)

Several MCP setups in one fleet. One server’s replay results help harden the others — probe, share notes, harden, verify.

```bash
npm run twin -- fixtures/twin/vulnerable-fleet
```

Details: `fixtures/TWIN_MATRIX.md`.

### Live probe (June 2026)

Spawns official `@modelcontextprotocol/*` servers from your config, connects with the MCP SDK, lists runtime tools, and compares them to what the static scan saw.

```bash
npm run probe -- fixtures/live/official-memory
npm run replay -- fixtures/replay/clean-agent --live
```

Defaults: localhost only, official package allowlist, remote URLs skipped unless you pass `--allow-remote`. See `fixtures/live/README.md`.

---

## Project layout

```
src/scanner/     config loaders + security checks
src/replay/      sandbox, attack corpus, reports
src/mutation/    hardening planner + before/after
src/decoy/       honeypot tools + routing
src/twin/        multi-server fleet loop
src/live/        runtime MCP probe
src/web/         local dashboard
fixtures/        sample configs for tests and demos
```

---

## Tests and CI

```bash
npm test          # 74 tests (2 optional live integration tests skipped by default)
npm run scan -- fixtures/clean-setup
```

GitHub Actions runs the same on every push to `main`.

---

## Honest limits

- **Scan** is static — it only sees what is in your files unless you use **probe** or **replay --live**.
- CVE coverage is a curated list, not every npm package.
- Command checks are pattern-based: they flag risk, not proof of exploitation.
- **Replay / mutate / decoy / twin** use deterministic simulation — they do not replace a full penetration test.

---

## License

MIT
