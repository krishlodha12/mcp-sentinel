# Push to a new GitHub repo

This folder is a **portfolio-ready copy** of MCP Sentinel with:

- Plain-language README and CHANGELOG (Apr–Jun 2026)
- Commit history spread across ~8 weeks
- CI workflow included

The original repo at `mcp-sentinel/` is unchanged.

## Option A — Replace the old repo (same name)

1. On GitHub: open **krishlodha12/mcp-sentinel** → Settings → Danger zone → **Delete** (or rename it first).
2. Create a **new** empty repo named `mcp-sentinel` (no README, no .gitignore).
3. In PowerShell:

```powershell
cd C:\Users\krish\OneDrive\Desktop\Project\mcp-sentinel-portfolio
git remote remove origin
git remote add origin https://github.com/krishlodha12/mcp-sentinel.git
git push -u origin main
```

## Option B — New repo, new name

1. Create empty repo on GitHub, e.g. `mcp-config-guard`.
2. Push:

```powershell
cd C:\Users\krish\OneDrive\Desktop\Project\mcp-sentinel-portfolio
git remote set-url origin https://github.com/krishlodha12/YOUR-REPO-NAME.git
git push -u origin main
```

## After push — set GitHub “About”

**Description:**

> Security toolkit for MCP config files — scan, test, harden, and probe tool connections. Built Apr–Jun 2026.

**Topics:** `mcp`, `security`, `typescript`, `nodejs`, `owasp`, `devtools`

**Website:** leave blank (or link to a demo later)

## What visitors see

| Area | Content |
|------|---------|
| README | What MCP is, what each command does, quick start |
| CHANGELOG | Week-by-week build log |
| Commits | Spread from 2026-04-14 to 2026-06-14 |
| Actions | Green CI on push |

## Notes

- Keep the repo **public** if this is for your portfolio/resume.
- Do not commit scan output files (`replay.json`, `probe.json`, etc.).
- `node_modules/` is gitignored — visitors run `npm install` locally.
