# Real-world replay fixture — CVE-2025-6514

Mirrors [Vulnerable MCP Project](https://vulnerablemcp.info/) **mcp-remote** OAuth bypass (CVE-2025-6514).

## Expected replay behavior

| Attack ID | Expected outcome |
|-----------|------------------|
| `cve-known-package` | exploited |
| `mcp-remote-oauth-bypass` | exploited |
| `unpinned-npx-pull` | exploited |
| `http-remote-mitm` | exploited (HTTP gateway in args) |

Static scan should still flag `cve-patterns`, `unpinned-versions`, and `insecure-transport` on the bundled JSON config.
