# Real-world fleet reference — SOC-style agent intel sharing

Phase 5 real-world fixture pairs a **CVE gateway** (`gateway/`, CVE-2025-6514 mcp-remote) with a **hardened observer** twin that receives exploit watchlist intel without posture change.

## Reference patterns

| Source | Pattern | What Sentinel simulates |
|--------|---------|-------------------------|
| [MITRE ATT&CK — Shared Intelligence](https://attack.mitre.org/) | Defenders share indicators across nodes | Fleet intel ledger + watchlist |
| [Google TAG — cross-team intel](https://cloud.google.com/blog/topics/threat-intelligence) | Compromised edge publishes IOCs to fleet | Gateway probe → observer receives entries |
| Phase 4 decoy (Zeltser / mcp-decoy) | Honeypot catches attacker intent | Fleet-wide decoy routing on watchlist |

## Expected vs actual (real-world-fleet fixture)

| Metric | Expected | Actual (run `npm run twin -- fixtures/twin/real-world-fleet`) |
|--------|----------|------------------------------------------------------------------|
| Gateway pre-harden exploit rate | > 0 (OAuth/remote) | Remote trust + unpinned npx exploited |
| Observer exploit rate | ≤ 15% | Hardened policies block corpus |
| Intel shared | Gateway → observer | Observer `intelReceived` > 0 |
| Gateway after | Partial — policy only | `trustRemoteTools: false` |
| Observer mutations | None | Already hardened — watchlist only |
| Fleet decoy | 100% of watchlist | Ghost tools trigger on gateway exploits |

## Why partial gateway fix is correct

Same as Phase 3/4: agent policy hardening + decoy routing do not auto-patch `mcp-remote-cve-2025-6514.json`. Observer intel sharing demonstrates continuous fleet telemetry without false mutations on clean twins.

## Manual verify

```bash
npx tsx src/cli.ts twin fixtures/twin/real-world-fleet --output twin.json --markdown twin.md
```

Check `twin.json` → `ledger.watchlist` for remote attack IDs and `agents[].intelReceived` on observer.
