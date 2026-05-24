---
name: lgw-cli
description: >
  Apply when working on the lgw CLI (cli/ directory) — adding commands, modifying
  existing ones, editing utilities, or writing tests. Covers architecture decisions,
  key invariants, non-obvious patterns, and testing constraints.
---

# Skill — lgw CLI

## File Map

| File                          | Role                                                  |
|-------------------------------|-------------------------------------------------------|
| `cli/bin/lgw.js`              | Entry point — registers all commands via Commander    |
| `cli/src/commands/add.js`     | `lgw add` — patches docker-compose.yml, handles hosts |
| `cli/src/commands/list.js`    | `lgw list` — queries Traefik API + Docker inspect     |
| `cli/src/utils/compose.js`    | YAML read/write helpers for docker-compose files      |
| `cli/src/utils/hosts.js`      | `/etc/hosts` matching, validation, and writing        |
| `cli/test/compose.test.js`    | Unit tests for YAML mutation logic                    |
| `cli/test/hosts.test.js`      | Unit tests for host matching and validation           |

**Stack:** Node.js ESM (`"type": "module"`), Node >=20, no build step.
**Dependencies:** `commander`, `yaml` v2, `@inquirer/prompts`.
**Setup:** `just cli-setup` (`chmod +x` + `npm install` + `npm link`).
**Tests:** `npm test` (uses `node --test` auto-discovery).

---

## lgw add — Key Invariants

### TTY vs non-TTY

`process.stdin.isTTY` determines the mode:

- **TTY** — prompts for missing options (`select`, `input`, `confirm`), then prints the
  equivalent non-interactive command so the dev can script it next time
- **non-TTY** — all three flags (`--service`, `--domain`, `--port`) are required; exits
  with a clear error if any are missing

This makes the command safe for CI/CD pipelines.

### Port validation

Commander's `Number` coercion turns `--port abc` into `NaN`. Check `port !== undefined`
(not provided) separately from `!Number.isInteger(port) || port <= 0` (invalid value):

```js
if (port !== undefined && (!Number.isInteger(port) || port <= 0)) {
  console.error('Error: --port must be a positive integer');
  process.exit(1);
}
// Later, check for "not provided":
if (port === undefined) { /* prompt or error */ }
```

### Hosts file flow

Only prompt/write for `.localhost` domains — remote domains have real DNS.

Decision tree:

1. Domain does not end in `.localhost` → print DNS note, skip
2. Domain ends in `.localhost`:
   - Read `/etc/hosts` once (`hasHost`) wrapped in `try/catch` — unreadable = treat as absent
   - Store result in `verifiedNotInHosts` to avoid a second read
   - **TTY**: prompt confirm if not already present; if flag `--write-hosts` is set explicitly, respect it without prompting
   - **non-TTY**: default `false`; requires explicit `--write-hosts` to write
   - Call `addHost(domain, { skipCheck: verifiedNotInHosts })` — `skipCheck: true` skips the
     internal `hasHost` re-read when we already verified

The `/etc/hosts` check happens **after** the compose file is written. If hosts is unreadable,
the compose write still succeeds — never abort a successful label update over a hosts error.

### Compose mutation (addTraefikLabels)

Labels in docker-compose can be a **sequence** (`- key=value`) or a **map** (`key: value`).
`addTraefikLabels` handles both using `isSeq`/`isMap` from the `yaml` library:

- **Sequence**: find existing label by key prefix (`key=`), replace in place or append
- **Map**: use `labelsNode.set(key, value)` — naturally idempotent
- **Unknown type**: throw with a clear message

Service networks and top-level networks follow the same seq/map detection pattern.

The function is fully idempotent — safe to call on the same compose file multiple times.

### After writing

Always print the next step — never auto-run `docker compose up`:

```
Service 'web' is now routed to http://app.localhost

To apply the changes:
  docker compose up -d web
```

The targeted `up -d <service>` is intentional — more surgical than restarting all services.
Don't add an option to auto-run it: `.env` overrides, `--project-name`, `--profile`, and
container state make silent exec too unpredictable.

---

## lgw list — Key Invariants

### Data sources

1. **Traefik API** (`http://127.0.0.1:<port>/api/http/routers`, where `<port>` is
   `process.env.TRAEFIK_PORT_DASHBOARD ?? '8000'`)
   — provides routes, rules, entrypoints, status
2. **Docker inspect** (`docker inspect --format '{{json .Config.Labels}}' <IDs>`)
   — provides `com.docker.compose.project.config_files` for the SOURCE column

If Docker is unavailable, SOURCE shows `—` for all rows. Never crash on missing Docker.

### URL scheme

Derived from entrypoints: `websecure` → `https://`, anything else → `http://`. This is
authoritative because Traefik knows what it's actually listening on.

Do **not** infer scheme from the domain suffix (e.g., non-`.localhost` ≠ https). That was
a bug — the scheme depends on Traefik config, not the domain name.

### Filtering

Skip routers where `r.name.endsWith('@internal')`. Everything else is shown, including the
Traefik dashboard router.

### Path abbreviation

`com.docker.compose.project.config_files` is a comma-separated list of absolute paths.
Take the first one and abbreviate `$HOME` to `~`.

---

## hosts.js — Key Invariants

### matchesHost(content, domain)

Pure function — takes file content as a string, no I/O. Exported specifically for testing.

Processing pipeline before regex matching:

1. Filter lines that start with `#` (fully commented)
2. Strip everything after `#` on remaining lines (inline comments)
3. Run case-insensitive (`i` flag) multiline (`m` flag) regex

This prevents false positives on:
- `# 127.0.0.1 app.localhost` (fully commented)
- `127.0.0.1 localhost # app.localhost` (domain only in inline comment)

### Domain validation (VALID_HOSTNAME)

RFC 1123 hostname rules — stricter than a simple allowlist:

```
/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$/
```

Rejects: `app..localhost` (empty label), `.app.localhost` (leading dot),
`app.localhost.` (trailing dot), `-app.localhost` (leading hyphen),
`app-.localhost` (trailing hyphen in label).

### addHost normalization

`addHost` normalizes `domain` to lowercase before validation, matching, and writing.
DNS is case-insensitive — entries in `/etc/hosts` are always lowercase for consistency.

### skipCheck option

`addHost(domain, { skipCheck: true })` skips the internal `hasHost` read. Use only when
the caller has already verified the domain is absent (avoids double file read).

---

## Testing Constraints

**`matchesHost` and `addTraefikLabels` are the primary testable surfaces** — they are pure
functions with no I/O beyond parameters.

**`addHost` cannot be tested end-to-end** without either ESM module mocking (check the
[Node.js test runner docs](https://nodejs.org/api/test.html) for current `mock.module()`
availability) or refactoring `addHost` to accept an injected writer function. Only test
the validation/throw path: `addHost('invalid!', { skipCheck: true })` — it throws before
reaching `execFileSync`.

Do **not** add `doesNotThrow` tests for `addHost` with valid domains + `skipCheck: true`
— they will call `execFileSync('sudo', ['tee', ...])` and fail in non-root environments.
If full coverage of the write path is needed, inject the exec call via a parameter
(e.g., `{ skipCheck, _write }`) so tests can pass a no-op.

### compose.test.js helpers

`labels()` and `networks()` assert node existence before calling `.toJSON()` — this gives
a clear error message instead of `TypeError: Cannot read properties of undefined`.

`hasLabels()` handles both array and object (seq vs map) YAML forms:
- Array: `l.includes(label)`
- Object: split on first `=`, check `String(l[key]) === value`

For label presence assertions, use `hasLabels()` instead of `deepEqual` — order is not a
contract of `addTraefikLabels`.

The `traefik.enable` value in map form may be string `'true'` or boolean `true` depending
on yaml serialization. Accept both: `l['traefik.enable'] === 'true' || l['traefik.enable'] === true`.
