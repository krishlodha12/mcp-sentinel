# Decoy matrix — Phase 4 fixtures

Phase 4 reuses the Phase 2 replay fixtures. Each row maps exploit routing to **broken (decoy catches + real hardens)**, **clean (minimal routing)**, and **real-world (documented honeypot pattern)**.

| Scenario | Broken (`vulnerable-agent`) | Clean (`clean-agent`) | Real-world |
|----------|---------------------------|------------------------|------------|
| Exploit routing | All pre-harden exploits → ghost tools | ≤ 4 routed (already blocked) | OAuth/remote exploits routed |
| Ghost-tool catch rate | 100% of routed attacks | 100% (few routed) | 100% of routed |
| Real-path hardening | Phase 3 mutations applied | No-op | `trustRemoteTools` tightened |
| Dual-path outcome | Attacker shunted to decoy; real hardened | No false decoy spam | Decoy catches; CVE config remains |

## AICON flow

**AICON** (Agent Infrastructure CONtainment) — when replay finds exploited attacks:

1. **Decoy path** — copy weak agent sandbox, inject ghost tools from `src/decoy/catalog.json`, route each exploited attack to a matching honeypot tool (`get_*` for exfil, `execute_*` for shell, `set_*` for injection/jailbreak).
2. **Real path** — apply Phase 3 mutations (policies + system prompt), replay again for before/after score.

The attacker that would have hit the real weakness gets shunted into the fake MCP surface; telemetry records ghost-tool triggers with simulated args and evidence.

## Fixture folders (reuse Phase 2)

| Folder | Role | Before decoy | After decoy |
|--------|------|--------------|-------------|
| `fixtures/replay/vulnerable-agent/` | Broken — weak agent + bad MCP | ≥ 60% exploited, ≥ 15 routed | Real ≤ 20% exploited; 100% decoy catch |
| `fixtures/replay/clean-agent/` | Clean — hardened agent | ≤ 15% exploited, ≤ 4 routed | No mutations; minimal decoy noise |
| `fixtures/replay/real-world/` | CVE-2025-6514 + decoy pattern | Remote attacks exploited | Policy blocks remote; decoy catches attempts |

See `fixtures/decoy/real-world/README.md` for the documented public honeypot reference (Zeltser / mcp-decoy).

## Phase 4 done when

```bash
npm test
npm run decoy -- fixtures/replay/vulnerable-agent
npm run decoy -- fixtures/replay/clean-agent
npx tsx src/cli.ts decoy fixtures/replay/real-world --output decoy.json
```

Decoy tests pass; vulnerable agent shows dual-path improvement, clean agent has minimal routing, real-world shows partial hardening with decoy telemetry.

## Decoy engine

```
src/decoy/     catalog, generator, router, engine, reporters
```

Ghost tools are injected as `decoy-tools.json` in the decoy sandbox. Routing is deterministic — no live MCP server required.
