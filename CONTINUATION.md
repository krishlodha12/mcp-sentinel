# Continuation notes — MCP Sentinel

> **Agents:** read this file at the start of every session. Update it before ending any session with meaningful changes. See also `.cursor/rules/mcp-sentinel-session.mdc`.

## Project

**MCP Sentinel** — static security scanner for MCP configs (tool poisoning, injection, permissions, supply chain). Maps to OWASP Agentic Top 10 (2026).

- **Path:** `mcp-sentinel/`
- **Repo:** https://github.com/krishlodha12/mcp-sentinel (private)

## Phase status

| Phase | Status |
|-------|--------|
| 1 — MCP scanner | **Done** |
| 2 — Sandbox replay harness | **Done** |
| 3 — Auto-mutation engine | **Done** |
| 4 — Decoy / AICON | **Done** |
| 5 — Closed-loop twin | Long-term |

## Phase 1 — done (verified)

- [x] CLI (`src/cli.ts`) + web UI (`npm run ui`)
- [x] 10 checks in `src/scanner/checks/`
- [x] Loaders: mcp.json, server.json, tools.json
- [x] OWASP mapping, terminal/JSON/markdown reports
- [x] Three fixtures + `fixtures/CHECK_MATRIX.md`
- [x] Real-world: CVE-2025-6514 (`fixtures/real-world/`)
- [x] Tests: `tests/fixtures.test.ts`, `tests/scanner.test.ts` — **12/12 passing**
- [x] GitHub pushed
- [x] Windows: `setup.ps1`, `run.ps1`

## Phase 2 — done (verified)

- [x] `replay` CLI command — `npm run replay -- fixtures/replay/vulnerable-agent`
- [x] Attack corpus: `src/replay/corpus/attacks.json` (25 attacks)
- [x] Sandbox copy to temp dir + Phase 1 static scan bundled in report
- [x] Deterministic evaluators: `src/replay/evaluators/conditions.ts`
- [x] Replay reporters (terminal + JSON + markdown)
- [x] Three fixtures + `fixtures/REPLAY_MATRIX.md`
- [x] Tests: `tests/replay.test.ts` — **22/22 total tests passing**

Optional polish (not blocking): Docker subprocess spawn for live MCP servers, replay tab in web UI.

## Phase 3 — done (verified)

- [x] `mutate` CLI command — `npm run mutate -- fixtures/replay/vulnerable-agent`
- [x] Mutation planner from replay exploit evidence (`src/mutation/planner.ts`)
- [x] Policy + system-prompt hardening (`src/mutation/apply.ts`)
- [x] Before/after replay score (`src/mutation/engine.ts`)
- [x] Mutation reporters (terminal + JSON + markdown)
- [x] Reuses Phase 2 replay fixtures + `fixtures/MUTATION_MATRIX.md`
- [x] Tests: `tests/mutation.test.ts` — extends total test count

Agent-only mutations. MCP config fixes emitted as recommendations; full config auto-repair is future work.

## Phase 4 — done (verified)

- [x] `decoy` CLI command — `npm run decoy -- fixtures/replay/vulnerable-agent`
- [x] Ghost-tool catalog (`src/decoy/catalog.json`) — get/set/execute honeypots
- [x] AICON routing: exploited attacks → decoy sandbox; real path → Phase 3 harden
- [x] Decoy reporters (terminal + JSON + markdown)
- [x] Reuses Phase 2 replay fixtures + `fixtures/DECOY_MATRIX.md`
- [x] Real-world doc: `fixtures/decoy/real-world/README.md` (Zeltser / mcp-decoy pattern)
- [x] Tests: `tests/decoy.test.ts` — **49/49 total tests passing**

Deterministic routing simulation — no live MCP honeypot server required.

## Phase 5 — long-term

## Architecture (don't re-litigate)

- Node/TypeScript, ESM
- Checks implement `SecurityCheck`, registered in `src/scanner/checks/index.ts`
- Replay: `AgentConfig` + MCP paths → sandbox → corpus → `ReplaySummary` (includes `ScanSummary`)
- Mutation: replay → plan → harden `agent.json` → replay → `MutationSummary` with before/after
- Decoy: replay → route exploits to ghost tools (AICON) → harden real path → `DecoySummary` dual-path
- Every finding has `explanation` + `remediation` for UI/resume

## Read first

1. `README.md`
2. `fixtures/CHECK_MATRIX.md` + `fixtures/REPLAY_MATRIX.md` + `fixtures/MUTATION_MATRIX.md` + `fixtures/DECOY_MATRIX.md`
3. `src/scanner/engine.ts`
4. `src/mutation/engine.ts`
5. `src/decoy/engine.ts`

## Commands

```bash
cd mcp-sentinel
npm test
npm run scan -- fixtures/vulnerable-setup
npm run replay -- fixtures/replay/vulnerable-agent
npm run replay -- fixtures/replay/clean-agent
npm run mutate -- fixtures/replay/vulnerable-agent
npm run decoy -- fixtures/replay/vulnerable-agent
npm run ui
```

## Session log (update me)

| Date | What happened | Next |
|------|---------------|------|
| 2026-06-14 | Phase 1 built, three-fixture validation, CVE-2025-6514, pushed to GitHub | Phase 2 sandbox harness when ready |
| 2026-06-14 | Phase 2 replay harness: corpus, sandbox, evaluators, CLI, three fixtures, 22 tests green | Phase 3 auto-mutation when ready |
| 2026-06-14 | Phase 3 mutation engine: planner, apply, mutate CLI, MUTATION_MATRIX, mutation tests | Phase 4 decoy/AICON when ready |
| 2026-06-14 | Phase 4 AICON decoy: ghost catalog, router, decoy CLI, DECOY_MATRIX, 49 tests green | Phase 5 closed-loop twin (long-term) |
