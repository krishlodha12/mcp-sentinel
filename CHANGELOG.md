# Changelog

Development timeline for MCP Sentinel. Work spanned **April 14 – June 14, 2026** (~8 weeks).

---

## June 2026

### 2026-06-14 — Documentation pass
- Rewrote README and added this changelog for clearer onboarding
- CI: fixed live-probe test timeout with remote-only fixture

### 2026-06-08 — Live MCP probe
- `probe` CLI: spawn official MCP servers, list runtime tools, compare to static scan
- Web UI **Live probe** tab and `/api/probe` endpoints
- `replay --live` merges runtime tools before running the attack corpus
- Fixtures under `fixtures/live/`

### 2026-06-02 — CI hardening
- Scan step uses `fixtures/clean-setup` (intentionally vulnerable fixtures exit non-zero by design)
- Workflow paths aligned with repo-root layout

---

## May 2026

### 2026-05-22 — Step 5: Fleet mode (twin)
- Multi-server `fleet.json` loader and shared intel ledger
- Closed loop: probe → share findings → cross-harden → fleet decoy → verify
- Fixtures: `fixtures/twin/vulnerable-fleet/`, `clean-fleet/`, `real-world-fleet/`

### 2026-05-14 — Step 4: Decoy tools
- Ghost-tool catalog and routing for exploited attacks
- Dual-path report: honeypot catches + real-path hardening
- Real-world write-up: `fixtures/decoy/real-world/`

### 2026-05-04 — Steps 2 & 3: Replay + auto hardening
- Replay harness: temp sandbox, 25-attack corpus, blocked vs exploited report
- Mutation engine: replay-driven policy and prompt tightening with before/after score
- Fixtures under `fixtures/replay/`

---

## April 2026

### 2026-04-26 — Step 1 complete
- Three fixture sets (broken, clean, real-world CVE-2025-6514)
- Fixture contract tests and `CHECK_MATRIX.md`
- Terminal, JSON, and Markdown reporters

### 2026-04-18 — Step 1: Scanner core
- CLI entrypoint and 10 security checks
- Loaders for `mcp.json`, `server.json`, `tools.json`
- OWASP Agentic Top 10 mapping on findings
- Local web UI (`npm run ui`)

### 2026-04-14 — Project start
- Repository scaffold, TypeScript/Node setup, initial CI workflow
- Windows helpers: `setup.ps1`, `run.ps1`
