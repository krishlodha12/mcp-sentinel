# Check matrix — Phase 1 fixtures

Three fixtures per phase. Each row maps a scanner check to where it is **planted (broken)**, **absent (clean)**, and **documented in the wild (real-world)**.

| Check ID | Broken trigger | Clean (no false positive) | Real-world |
|----------|----------------|---------------------------|------------|
| `hidden-instructions` | `vulnerable-setup/server.json` → `_meta.tools[0].description` (U+200B) | `clean-setup/server.json` → plain descriptions | — |
| `rtl-override` | `vulnerable-setup/server.json` → `_meta.prompts[0].description` (U+202E) | clean prompt text | — |
| `html-comment-injection` | `vulnerable-setup/server.json` → `_meta.resources[0].description` | clean resource text | — |
| `base64-payload` | `vulnerable-setup/server.json` → `_meta.tools[2].description` | `read_notes` without encoded blob | — |
| `schema-string-injection` | `vulnerable-setup/server.json` → `write_file` path param description | safe path description | — |
| `command-injection` | `run_command` tool + `mcp.json` npx patterns | `check_job_status` (no shell params) | `real-world` npx + mcp-remote |
| `broad-permissions` | `vulnerable-setup/mcp.json` → `ALLOWED_DIRECTORIES: /` | scoped `C:\Users\dev\project-data` | — |
| `unpinned-versions` | `latest`, `npx -y` without version | pinned `@1.0.4` / `@1.0.0` | `npx -y mcp-remote` |
| `cve-patterns` | unpinned `@modelcontextprotocol/server-filesystem` | pinned semver (CVE skipped) | **CVE-2025-6514** / mcp-remote |
| `secrets-in-config` | `vulnerable-setup/mcp.json` → fake `sk-ant-...` | `${BRAVE_API_KEY}` placeholder | — |
| `insecure-transport` | `http://` in `mcp.json` url + `server.json` remotes | `https://` only | `http://gateway...` in args |
| `prompt-resource-poisoning` | poisoned prompt/resource text | clean prompt/resource text | — |

## Fixture folders

| Folder | Role |
|--------|------|
| `fixtures/vulnerable-setup/` | Broken — deliberate flaws |
| `fixtures/clean-setup/` | Clean — mirror structure, fixed |
| `fixtures/real-world/` | Documented public CVE case |

## Phase 1 done when

```bash
npm test
```

All fixture tests pass: broken fires every check, clean has zero critical/high/medium, real-world matches CVE-2025-6514 expectations.
