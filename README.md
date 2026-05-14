# MCP Sentinel

Static security scanner for [Model Context Protocol](https://modelcontextprotocol.io/) configs. Think antivirus, but for the plugins you hook up to Claude, Cursor, or any other agent host.

Most people paste MCP server configs from blog posts and never look at them again. That's a problem — tool descriptions are prompt injection surface, `npx -y` pulls whatever's on npm today, and filesystem servers often mount way more than they need to. MCP Sentinel reads your config files *before* you connect them and flags the obvious footguns.

## What it checks

| Check | What it's looking for |
|-------|------------------------|
| Hidden instructions | Zero-width Unicode, bidi overrides, HTML comments in tool/prompt text |
| Base64 payloads | Encoded blobs in descriptions that decode to instructions |
| Command injection | Shell-style tools, risky schema fields, unsafe launch patterns |
| Broad permissions | Root/home paths, wildcard dirs, admin-ish env vars |
| Unpinned versions | `npx -y` without `@version`, `latest`, semver ranges |
| CVE patterns | Curated list of MCP-adjacent package advisories |
| Secrets in config | API keys and tokens sitting in JSON on disk |
| Prompt/resource poisoning | Same text checks on prompts & resources (most scanners skip these) |

Findings map to the [OWASP Top 10 for Agentic Applications (2026)](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).

## Quick start

**Windows:** If `npm` is not recognized after `setup.ps1`, you didn't restart the terminal yet. Either:

```powershell
# refresh PATH in the current window (no restart needed)
$env:Path += ";C:\Program Files\nodejs"

# or use the wrapper (always works)
.\run.ps1 ui
.\run.ps1 scan fixtures/vulnerable-setup
```

First-time setup:

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
# then close/reopen terminal, or run the $env:Path line above
```

### CLI

```bash
# Scan a file or directory
npx tsx src/cli.ts scan path/to/mcp.json

# JSON + Markdown reports
npx tsx src/cli.ts scan ./my-agent --output report.json --markdown report.md

# CI-friendly exit codes: 2 = critical, 1 = high, 0 = clean
npx tsx src/cli.ts scan . --min-severity high
```

### Web UI

```bash
npm run ui
```

Opens at `http://localhost:3847`. Drop a config, paste JSON, or hit **Run demo scan** to see findings on the bundled vulnerable fixture.

## Supported inputs

- `mcp.json` / `.mcp.json` — Cursor, Claude Desktop, etc.
- `claude_desktop_config.json`
- `server.json` — MCP registry format (tools in `_meta`, `packages`, `remotes`)
- `tools.json` — exported tool manifests

## Fixture validation (Phase 1 done criteria)

Three fixtures — see `fixtures/CHECK_MATRIX.md`:

| Folder | Role |
|--------|------|
| `fixtures/vulnerable-setup/` | Broken — one planted issue per check |
| `fixtures/clean-setup/` | Clean — same shape, zero critical/high/medium |
| `fixtures/real-world/` | CVE-2025-6514 (mcp-remote) from [Vulnerable MCP Project](https://vulnerablemcp.info/) |

```bash
npm test   # includes fixture contract tests
```

### Replay harness (Phase 2)

Run the attack corpus against an agent fixture (agent.json + MCP configs). Copies configs into an isolated temp sandbox, runs Phase 1 static scan, then replays 25 attacks (injection, jailbreak, exfiltration, multi-turn).

```bash
npm run replay -- fixtures/replay/vulnerable-agent
npm run replay -- fixtures/replay/clean-agent --output replay.json
```

| Folder | Role |
|--------|------|
| `fixtures/replay/vulnerable-agent/` | Broken — high exploit rate (≥60%) |
| `fixtures/replay/clean-agent/` | Clean — attacks blocked (≤15% exploit rate) |
| `fixtures/replay/real-world/` | CVE-2025-6514 mcp-remote OAuth scenario |

See `fixtures/REPLAY_MATRIX.md`.

### Auto-mutation engine (Phase 3)

Replay failures drive deterministic hardening of `agent.json` policies and system prompt, then the corpus runs again for a before/after exploit score.

```bash
npm run mutate -- fixtures/replay/vulnerable-agent
npm run mutate -- fixtures/replay/clean-agent --output mutation.json
```

| Folder | Role |
|--------|------|
| `fixtures/replay/vulnerable-agent/` | Broken — high exploit rate drops after mutate |
| `fixtures/replay/clean-agent/` | Clean — no policy/prompt changes |
| `fixtures/replay/real-world/` | CVE-2025-6514 — partial fix (policy only) |

See `fixtures/MUTATION_MATRIX.md`.

### AICON decoy routing (Phase 4)

Exploited attacks get shunted to a decoy MCP surface with ghost tools while the real agent path receives Phase 3 hardening. Dual-path report: decoy detections + real before/after score.

```bash
npm run decoy -- fixtures/replay/vulnerable-agent
npm run decoy -- fixtures/replay/clean-agent --output decoy.json
```

| Folder | Role |
|--------|------|
| `fixtures/replay/vulnerable-agent/` | Broken — 100% decoy catch + real hardens |
| `fixtures/replay/clean-agent/` | Clean — minimal routing, no false triggers |
| `fixtures/replay/real-world/` | Documented honeypot pattern + CVE partial fix |

See `fixtures/DECOY_MATRIX.md` and `fixtures/decoy/real-world/README.md`.

```
src/decoy/            AICON catalog, ghost tools, routing, reports
src/mutation/         planner, apply, before/after reports
src/replay/           sandbox, corpus, evaluators, replay reports
src/scanner/loaders/  parses config formats
src/reports/          terminal + JSON + markdown output
src/web/              local dashboard
fixtures/             intentional bad configs for demos/tests
```

## Roadmap (5-phase plan)

| Phase | Status |
|-------|--------|
| 1. **MCP scanner** | Done — static config checks |
| 2. **Sandbox replay harness** | Done — attack corpus + agent fixtures |
| 3. **Auto-mutation engine** | Done — replay-driven agent hardening |
| 4. **AICON decoy routing** | Done — ghost tools + dual-path report |
| 5. Closed-loop attack twin | Long-term |

See `CONTINUATION.md` for handoff notes if you're picking this up in a new chat.

## Limitations (be honest on your resume)

- Static only. Runtime-registered tools won't show up unless you export them.
- CVE list is curated, not exhaustive.
- Command injection detection is pattern-based — it flags risk, not proof of exploitability.

## License

MIT
