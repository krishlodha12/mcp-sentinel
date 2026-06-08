# Live probe fixtures

Legal live testing against **official** MCP reference servers you spawn locally.

| Folder | Role |
|--------|------|
| `official-memory/` | Single `@modelcontextprotocol/server-memory` — fast smoke test |
| `official-fleet/` | Filesystem + memory — multi-server probe demo |

## Run (legal — localhost only)

```bash
npm run probe -- fixtures/live/official-memory
npm run probe -- fixtures/live/official-fleet
```

Default guardrails:

- **stdio only** — spawns subprocesses from your `mcp.json`
- **official allowlist** — `@modelcontextprotocol/*` packages only
- **no remote URLs** unless you pass `--allow-remote` for endpoints you own
- **sandbox paths** — missing filesystem paths get a temp dir automatically

## What impresses people

Static scan reads JSON on disk. Live probe **connects**, calls `listTools`, and shows the **runtime tool surface** — including drift between config exports and what the server actually registers.
