# Real-world decoy reference — MCP honeypot pattern

Phase 4 real-world fixture reuses `fixtures/replay/real-world/` (CVE-2025-6514 mcp-remote). The **decoy pattern** is documented against public MCP honeypot work, not a second CVE.

## Reference implementations

| Source | Pattern | What Sentinel simulates |
|--------|---------|-------------------------|
| [Zeltser — Decoy MCP Server](https://zeltser.com/decoy-mcp-server-honeypot/) | Cloudflare Worker posing as privileged MCP; `tools/list` = recon, `tools/call` = intent | Ghost tools in `decoy-tools.json`; routing logs tool + args |
| [gweber/mcp-decoy](https://github.com/gweber/mcp-decoy) | Enterprise MCP hub with fake DB/Git tools; SIEM telemetry | Category-matched ghost tools + OWASP mapping in detections |
| [HoneyMCP](https://github.com/barvhaim/HoneyMCP) | GET/SET ghost tools for exfil vs injection | Catalog `kind`: `get`, `set`, `execute` |

## Expected vs actual (real-world fixture)

| Metric | Expected | Actual (run `npm run decoy -- fixtures/replay/real-world`) |
|--------|----------|-------------------------------------------------------------|
| Pre-harden exploit rate | > 0 (OAuth/remote attacks) | Remote trust + unpinned npx exploited |
| Decoy catch rate | 100% of routed | Each pre-harden exploit → ghost tool trigger |
| Real-path after | Partial — policy only | `trustRemoteTools: false` blocks remote replay |
| CVE config | Still flagged | Static scan + config-only exploits remain |

## Why partial fix is correct

CVE-2025-6514 is an MCP **config/supply-chain** issue (`npx -y mcp-remote`). Phase 3/4 harden the **agent** (`trustRemoteTools`) and route attacker intent to decoy — they do not auto-patch `mcp.json`. That matches Phase 3 scope: agent mutations + recommendations, not full config repair.

## OWASP mapping

Decoy detections map to:

- **ASI01** — injection/jailbreak routed to `set_*` ghost tools
- **ASI02** — exfiltration routed to `get_*` ghost tools  
- **ASI05** — shell/priv-esc routed to `execute_*` ghost tools

## Manual verify

```bash
npx tsx src/cli.ts decoy fixtures/replay/real-world --output decoy.json --markdown decoy.md
```

Check `decoy.json` → `detections[]` for routed OAuth/remote attack IDs and `score.realExploitRateAfter` < `realExploitRateBefore`.
