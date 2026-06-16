# Tap fixtures — runtime session forensics

Synthetic JSONL session logs for `forensics` CLI tests. These simulate what `tap` records from real Cursor ↔ MCP traffic.

| Fixture | Purpose |
|---------|---------|
| `suspicious-session.jsonl` | Shell exfil, response injection, tool-list drift |
| `burst-session.jsonl` | 11 rapid `read_file` calls in 10s |
| `clean-session.jsonl` | Benign single tool call — no matches |

## Usage

```bash
npm run forensics -- fixtures/tap/suspicious-session.jsonl
npm run tap -- --log /tmp/session.jsonl -- npx -y @modelcontextprotocol/server-memory
```

## Cursor mcp.json wrap

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": [
        "-y", "tsx",
        "C:/path/to/mcp-sentinel/src/cli.ts",
        "tap", "--log", "C:/path/to/mcp-session.jsonl", "--",
        "npx", "-y", "@modelcontextprotocol/server-memory"
      ]
    }
  }
}
```

After a session, run forensics on the log file.
