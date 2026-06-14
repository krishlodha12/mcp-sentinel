# Live probe fixtures

These configs start **official** MCP reference servers on your machine and list the tools they expose at runtime.

| Folder | What it tests |
|--------|----------------|
| `official-memory/` | Single `@modelcontextprotocol/server-memory` — quick smoke test |
| `official-fleet/` | Filesystem + memory — two servers in one config |

## Run (localhost only by default)

```bash
npm run probe -- fixtures/live/official-memory
npm run probe -- fixtures/live/official-fleet
```

Default safety rules:

- **stdio only** — spawns subprocesses from your `mcp.json`
- **official allowlist** — `@modelcontextprotocol/*` packages only
- **no remote URLs** unless you pass `--allow-remote` for endpoints you control
- **sandbox paths** — missing filesystem paths get a temp dir automatically

## Why probe exists

A static scan only reads JSON on disk. Live probe **connects** to the server, calls `listTools`, and shows what is actually registered — including differences from exported config files.
