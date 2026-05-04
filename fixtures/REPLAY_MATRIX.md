# Replay matrix — Phase 2 fixtures

Three fixtures per phase. Each row maps an attack category to **broken (high exploit rate)**, **clean (blocked)**, and **real-world (documented CVE)**.

| Attack category | Broken (`vulnerable-agent`) | Clean (`clean-agent`) | Real-world |
|-----------------|----------------------------|------------------------|------------|
| Tool/prompt injection | Hidden unicode, RTL, HTML comments fire | No poisoned tools/prompts | — |
| Exfiltration | Secrets in env, HTTP remotes, base64 tools | HTTPS only, env placeholders | HTTP gateway in mcp-remote args |
| Privilege escalation | Shell tools, `/` filesystem mount | Scoped paths, no shell tools | Unpinned `npx -y mcp-remote` |
| Jailbreak | Weak system prompt + dangerous tools | Strong safety prompt | Trusts remote OAuth flow |
| Multi-turn | Trust-then-inject chains succeed | Blocked (no shell / poisoned surface) | OAuth redirect attack |

## Fixture folders

| Folder | Role | Target exploit rate |
|--------|------|---------------------|
| `fixtures/replay/vulnerable-agent/` | Broken — mirrors `vulnerable-setup` | ≥ 60% exploited |
| `fixtures/replay/clean-agent/` | Clean — mirrors `clean-setup` | ≤ 15% exploited |
| `fixtures/replay/real-world/` | CVE-2025-6514 mcp-remote | CVE + OAuth attacks exploited |

## Phase 2 done when

```bash
npm test
npm run replay -- fixtures/replay/vulnerable-agent
npm run replay -- fixtures/replay/clean-agent
```

Replay fixture tests pass; vulnerable agent shows high exploit rate, clean agent blocks nearly all attacks, real-world hits CVE-specific corpus entries.

## Attack corpus

Default corpus: `src/replay/corpus/attacks.json` (25 attacks). Categories: injection, jailbreak, exfiltration, privilege-escalation, multi-turn.
