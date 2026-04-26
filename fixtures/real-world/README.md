# Real-world fixture: CVE-2025-6514 (mcp-remote)

## Source

- **Vulnerable MCP Project:** [vulnerablemcp.info](https://vulnerablemcp.info/) — lists **mcp-remote OS Command Injection (CVE-2025-6514)** as critical
- **Issue class:** unsanitized input passed to shell execution in the `mcp-remote` bridge package

This fixture is a realistic `mcp.json` snippet someone might paste to proxy a remote MCP server — exactly the install pattern advisories warn about.

## File

`mcp-remote-cve-2025-6514.json`

## Expected findings (static scan)

| Check | Expected | Why |
|-------|----------|-----|
| `cve-patterns` | ✅ CVE-2025-6514 | Package name `mcp-remote` in curated DB |
| `unpinned-versions` | ✅ high | `npx -y` without `@version` |
| `insecure-transport` | ✅ high | `http://gateway.example.com/mcp` in args |
| `command-injection` | ✅ medium/high | `npx -y` launch pattern |

## How to verify

```bash
npm run scan -- fixtures/real-world/mcp-remote-cve-2025-6514.json
```

Automated assertion: `tests/fixtures.test.ts` → `real-world fixture matches Vulnerable MCP Project expectations`

## Actual result (fill after run)

Last verified: project CI / local `npm test`

```
critical: 1+ (CVE-2025-6514)
high: 2+ (unpinned + insecure transport)
```

## Writeup sentence for resume/blog

> Ran MCP Sentinel against a Vulnerable MCP Project case (CVE-2025-6514 / mcp-remote). Static config scan flagged the documented package, floating install, and plain-HTTP endpoint — matching the public advisory without executing the server.
