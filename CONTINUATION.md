# Continuation notes — MCP Sentinel

> Paste or reference this file when starting a new chat. Keeps context without burning tokens on re-explaining the whole roadmap.

## What this project is

**MCP Sentinel** — Phase 1 of a 5-phase AI agent security toolchain. Static scanner for Model Context Protocol server configs. Catches tool poisoning, command injection surfaces, over-broad permissions, unpinned packages, secrets in config. Maps findings to OWASP Agentic Top 10 (2026).

Location: `mcp-sentinel/` in this workspace.

## What's done (Phase 1)

- [x] TypeScript CLI (`src/cli.ts`) — `scan`, `checks` commands
- [x] 10 security checks in `src/scanner/checks/`
- [x] Config loaders for mcp.json, server.json, tools.json
- [x] OWASP ASI01–ASI10 mapping
- [x] Terminal, JSON, Markdown reporters
- [x] Web UI (`npm run ui`) — drag/drop, paste, demo scan, explain buttons
- [x] Vulnerable fixtures in `fixtures/vulnerable-setup/`
- [x] Vitest suite in `tests/scanner.test.ts`

## Commands you'll use

```bash
cd mcp-sentinel
npm install
npm test
npm run scan -- fixtures/vulnerable-setup
npm run ui
npm run build
```

## Phase 2 — next up (NOT started)

**Sandbox replay harness.** Take an agent's MCP config, spin up isolated copy, run corpus of jailbreaks/prompt injections/multi-turn attacks, log pass/fail per attack. Output = vulnerability report *with evidence*, not just static flags.

Suggested approach when ready:
- Docker or subprocess sandbox per server
- Attack corpus as YAML/JSON (start with 20–30 public prompts)
- Hook into existing scanner for pre/post comparison
- Reuse `ScanSummary` type for unified reporting

## Phase 3 — auto-mutation engine (NOT started)

For each successful Phase 2 attack: auto-propose hardened system prompt + tighter tool permissions, re-run corpus, report before/after pass rate ("confidence score").

## Phase 4 — decoy / AICON integration (NOT started)

Route failed attacks into honeypot environment; real system gets Phase 3 hardening.

## Phase 5 — closed-loop twin (long-term)

Continuous phases 1–4 across agents/tenants with shared threat intel.

## Architecture decisions (don't re-litigate unless broken)

- **Node/TS** — matches MCP ecosystem, easy CLI + web
- **Static first** — no agent runtime required for Phase 1
- **Checks are pluggable** — implement `SecurityCheck` interface, add to `ALL_CHECKS`
- **Human-readable explanations** — every finding has `explanation` + `remediation` for UI and resume demos

## Files to read first in a new session

1. `README.md` — user-facing docs
2. `src/scanner/checks/index.ts` — check registry
3. `src/scanner/engine.ts` — orchestration
4. `fixtures/vulnerable-setup/server.json` — demo payload

## GitHub / resume checklist

- [ ] Push to GitHub (user hasn't asked to commit yet)
- [ ] Add real GitHub URL to web UI link in `index.html`
- [ ] Blog post or README screenshot of UI on vulnerable fixture
- [ ] Optional: GitHub Action that runs `npm test && npm run scan -- fixtures/`

## Token budget note

This file exists so new chats can `@CONTINUATION.md` instead of re-reading the full roadmap conversation. Target ~70% of context for implementation work, ~30% for orientation.
