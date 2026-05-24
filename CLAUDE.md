# CLAUDE.md — Local Gateway

## Tech Stack

- **Traefik v3** — central reverse proxy for local projects
- **Docker Compose** — local orchestration
- **just** — command runner (`Justfile` at the root)

---

## Project Context

This is a **local development tool**, not an application to deploy.
Its role: expose local projects via `*.localhost` through a shared Traefik proxy.

> Claude Code is encouraged for **developing this tool**, but the tool itself is meant
> to be used directly by the developer — not via Claude Code.

---

## Commands

Never list commands in this file or in any doc. The `Justfile` is the source of truth.
Commands are documented directly in the `Justfile` via concise comments.

```bash
just          # List all available commands with their descriptions
```

---

## Language

- Everything — code, config, comments, variables, commits, filenames, and documentation
  (README, CLAUDE.md, skills) — must be **100% English**
- Communication with Claude Code is in the developer's language — speak French,
  Claude will reply in French

---

## Collaboration Rules

- **Small steps** — if a change is large, propose a step-by-step plan and wait for approval before coding
- **Strict scope** — do not reformat, rename, or "clean up" code unrelated to the request
- **No obvious comments** — only add comments to clarify non-obvious behavior in source code

---

## Documentation — Core Rule

**Documentation must always follow the code. Drift is never acceptable.**

- Every code change must be accompanied by an update to `CLAUDE.md` and any affected skills
- This applies equally to changes made by Claude and by the developer manually
- When a developer makes a manual change, they can ask Claude Code to update the docs accordingly
- **PR reviews (including AI tools) must block any PR that modifies code without updating the docs**

---

## Skills

When adding a new Traefik route or middleware, read:

```text
.claude/skills/traefik-routing/SKILL.md
```

When writing or editing any Markdown file, read:

```text
.claude/skills/markdown/SKILL.md
```
