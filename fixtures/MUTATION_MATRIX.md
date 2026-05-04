# Mutation matrix — Phase 3 fixtures

Phase 3 reuses the Phase 2 replay fixtures. Each row maps a replay failure mode to **broken (improves after mutate)**, **clean (no-op)**, and **real-world (partial fix)**.

| Failure mode | Broken (`vulnerable-agent`) | Clean (`clean-agent`) | Real-world |
|--------------|---------------------------|------------------------|------------|
| Weak system prompt | Appends safety clause | Already hardened — no change | — |
| `followHiddenToolInstructions` | Set `false` | Already `false` | Already `false` |
| `allowShellExecution` | Set `false` | Already `false` | Already `false` |
| `trustRemoteTools` | Set `false` when HTTP remote exploited | Already `false` | Set `false` — blocks OAuth/SSRF replay |
| `maxAllowedPathScope` | `global` → `scoped` | Already `scoped` | Already `scoped` |
| Static scan findings | Recommendations only (MCP config not auto-edited) | None | CVE + unpinned npx still exploited |

## Fixture folders (reuse Phase 2)

| Folder | Role | Before mutate | After mutate |
|--------|------|---------------|--------------|
| `fixtures/replay/vulnerable-agent/` | Broken — weak agent + bad MCP | ≥ 60% exploited | ≥ 8 fewer exploits |
| `fixtures/replay/clean-agent/` | Clean — hardened agent | ≤ 15% exploited | No policy/prompt changes |
| `fixtures/replay/real-world/` | CVE-2025-6514 mcp-remote | OAuth/HTTP attacks exploited | Policy blocks remote trust; CVE config remains |

## Phase 3 done when

```bash
npm test
npx tsx src/cli.ts mutate fixtures/replay/vulnerable-agent
npx tsx src/cli.ts mutate fixtures/replay/clean-agent
npx tsx src/cli.ts mutate fixtures/replay/real-world --output mutation.json
```

Mutation tests pass; vulnerable agent shows before/after score improvement, clean agent is a no-op, real-world shows partial hardening with documented CVE limits.

## Mutation engine

Default flow: replay → plan mutations from exploit evidence → harden `agent.json` policies/prompt → replay again → before/after score.

```
src/mutation/     planner, apply, engine, reporters
```

Agent-only mutations in Phase 3. MCP config fixes are emitted as recommendations; full config auto-repair is future work.
