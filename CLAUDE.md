# CLAUDE.md — Local Gateway

## Tech Stack

- **Traefik v3** — central reverse proxy for dev workstations and remote servers
- **Docker Compose** — orchestration with environment-specific file merging via `COMPOSE_FILE`
- **just** — command runner (`Justfile` at the root)
- **lgw** — Node.js CLI (`cli/`) for connecting secondary projects to the gateway

---

## Environments

Two contexts are defined and must be used consistently throughout the project:

| Term       | Meaning                                                                          |
|------------|----------------------------------------------------------------------------------|
| **dev**    | Developer workstation — Mac/Linux, `*.localhost`, no SSL, single dev            |
| **remote** | Internet-facing server — real DNS, mandatory SSL, staging or production         |

---

## Project Context

This is an **opinionated meta project** — a shared infrastructure layer for all web projects.
It is not an application to deploy; it is the gateway that routes traffic to your applications.

The `remote` context is a first-class citizen in every decision — configs exist and are maintained
in parallel with `dev`. However, the remote setup is not yet battle-tested. Treat it as in-progress:
it will work in principle but will require adjustments when validated on a real server.

> Claude Code is encouraged for **developing this tool**, but the tool itself is meant
> to be used directly by the developer — not via Claude Code.

---

## Compose File Architecture

| File                         | Role                                   |
|------------------------------|----------------------------------------|
| `docker-compose.yml`         | Base — image, network, Docker socket   |
| `docker-compose.dev.yml`     | Dev workstation overrides              |
| `docker-compose.remote.yml`  | Remote server overrides                |
| `docker-compose.custom.yml`  | User extensions — gitignored           |

`COMPOSE_FILE` in `.env` (set by `just init`) tells Docker Compose which files to merge.
Never modify the committed Compose files for personal customizations — use `docker-compose.custom.yml`.

## Traefik Config Files

| File                         | Used by                      |
|------------------------------|------------------------------|
| `traefik/traefik.dev.yml`    | `docker-compose.dev.yml`     |
| `traefik/traefik.remote.yml` | `docker-compose.remote.yml`  |
| `traefik/dynamic_conf.yml`   | Both environments            |

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

## CLI — lgw

The `lgw` binary lives in `cli/`. It is a Node.js ESM project (Node >=20).

| File                          | Role                                      |
|-------------------------------|-------------------------------------------|
| `cli/bin/lgw.js`              | Entry point — registers all commands      |
| `cli/src/commands/add.js`     | `lgw add` — patches a project's compose   |
| `cli/src/commands/list.js`    | `lgw list` — shows active Traefik routes  |
| `cli/src/commands/info.js`    | `lgw info` — shows routing details for the current project |
| `cli/src/utils/compose.js`    | YAML read/write helpers                   |
| `cli/src/utils/hosts.js`      | `/etc/hosts` idempotent entry helper      |

**`lgw add`** — interactive when run in a terminal, flag-only when no TTY (CI/CD safe).
After interactive prompts it prints the equivalent non-interactive command.

**`lgw list`** — queries the Traefik API (default: `http://127.0.0.1:8000`) and cross-references
running containers via `docker inspect` to resolve compose file paths.
Columns: SERVICE, URL (with `http://` or `https://` scheme), SOURCE (path to compose file).
Respects `TRAEFIK_PORT_DASHBOARD` env var. Only works when the gateway is running.

**`lgw info`** — reads `docker-compose.yml` in the current directory and shows routing details
for all services that have `traefik.enable=true`. Does not require the gateway to be running.
Columns: SERVICE, URL, PORT, STATUS (from `docker compose ps`), HOSTS (`yes`/`no` for `.localhost`).

**Setup:** `cd cli && npm install && npm link`

---

## Skills

When working on the `lgw` CLI (commands, utilities, tests), read:

```text
.claude/skills/lgw-cli/SKILL.md
```

When adding a new Traefik route or middleware, read:

```text
.claude/skills/traefik-routing/SKILL.md
```

When writing or editing any Markdown file, read:

```text
.claude/skills/markdown/SKILL.md
```
