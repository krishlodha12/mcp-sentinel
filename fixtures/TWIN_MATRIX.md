# Twin matrix — Phase 5 fixtures

Phase 5 runs a **closed-loop attack twin** across a multi-agent fleet: probe → intel bus → cross-harden → fleet decoy → verify.

| Scenario | Broken (`vulnerable-fleet`) | Clean (`clean-fleet`) | Real-world (`real-world-fleet`) |
|----------|----------------------------|------------------------|----------------------------------|
| Fleet probe | Scout + worker high exploit rate | Both ≤ 15% exploited | Gateway exploited; observer clean |
| Intel sharing | Scout publishes; worker receives sibling intel | Minimal entries | Gateway → observer watchlist |
| Cross-harden | Fleet-wide mutations on weak policies | No-op | Gateway `trustRemoteTools`; observer unchanged |
| Fleet decoy | 100% catch on watchlist | Few/no triggers | Remote attacks routed |
| Closed loop | Fleet exploit rate drops ≥ 8 | Stable low rate | Partial gateway fix |

## Closed-loop flow

1. **Probe** — each agent in `fleet.json` runs Phase 2 replay in its sandbox.
2. **Intel bus** — exploit/block outcomes publish to a shared ledger (`src/twin/intel.ts`).
3. **Cross-harden** — Phase 3 mutations planned from local + sibling exploit intel.
4. **Fleet decoy** — Phase 4 routes deduplicated fleet exploits to ghost tools.
5. **Verify** — re-replay each agent; report per-agent and fleet-wide before/after.

## Fixture folders

| Folder | Role | Agents |
|--------|------|--------|
| `fixtures/twin/vulnerable-fleet/` | Broken — scout probes, worker cross-hardens | scout (probe), worker (shell blocked locally) |
| `fixtures/twin/clean-fleet/` | Clean — hardened twins, no false intel noise | primary, secondary |
| `fixtures/twin/real-world-fleet/` | CVE gateway + SOC observer pattern | gateway (CVE-2025-6514), observer (hardened) |

See `fixtures/twin/real-world-fleet/README.md` for the documented fleet intel reference.

## Phase 5 done when

```bash
npm test
npm run twin -- fixtures/twin/vulnerable-fleet
npm run twin -- fixtures/twin/clean-fleet
npx tsx src/cli.ts twin fixtures/twin/real-world-fleet --output twin.json
```

Twin tests pass; vulnerable fleet shows fleet-wide improvement, clean fleet is stable, real-world shows gateway partial fix with observer intel watchlist.

## Twin engine

```
src/twin/     fleet loader, intel ledger, closed-loop engine, reporters
```

Deterministic simulation — no live multi-agent runtime or external intel bus required.
