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

## Project layout

```
src/scanner/checks/   one file per rule
src/scanner/loaders/  parses config formats
src/reports/          terminal + JSON + markdown output
src/web/              local dashboard
fixtures/             intentional bad configs for demos/tests
```

## Roadmap (5-phase plan)

This repo is **Phase 1** — static scanner. Later phases (not built yet):

1. ✅ **MCP scanner** — you are here
2. Sandbox replay harness — run attack corpus against a agent copy
3. Auto-mutation engine — harden prompts, re-test, score before/after
4. Decoy integration — route failed attacks into honeypot (AICON)
5. Closed-loop attack twin — continuous multi-agent intel sharing

See `CONTINUATION.md` for handoff notes if you're picking this up in a new chat.

## Limitations (be honest on your resume)

- Static only. Runtime-registered tools won't show up unless you export them.
- CVE list is curated, not exhaustive.
- Command injection detection is pattern-based — it flags risk, not proof of exploitability.

## License

MIT
