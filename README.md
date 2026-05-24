# Gateway — Traefik for Every Project, Every Environment

Ever wished you could spin up a new web project and have routing, SSL, and networking just *work* — whether on your
laptop or a production server — without touching Nginx configs, fighting SSL certificates, or wrestling with Docker
networking every single time?

That's what this project is.

---

## What Is This?

This is a **meta project** — a shared infrastructure layer that sits alongside all your web projects and handles
everything network-related so you don't have to.

It wraps **Traefik** into a single, reusable setup that works across two well-defined contexts:

| Context    | What it means                                                                                     |
|------------|---------------------------------------------------------------------------------------------------|
| **dev**    | A developer's workstation (Mac, Linux). `*.localhost` URLs, no SSL, single dev, zero friction.   |
| **remote** | A server exposed to the internet. Real DNS, mandatory SSL, staging or production.                |

These two contexts are fundamentally different in terms of security, SSL, and configuration — and this project
treats them as such. The `COMPOSE_FILE` in your `.env` (set by `just init`) determines which context is active.

---

## Philosophy — Opinionated by Design

This project makes deliberate choices about how Traefik is configured and how environments are managed.
Those choices won't suit everyone — and that's fine.

> If you want full control over your Traefik setup, this project is not for you. Fork it, ignore it, or
> roll your own config. This tool is for developers who want things to just work.

**What this means in practice:**

- The project owns `docker-compose.yml`, `docker-compose.dev.yml`, and `docker-compose.remote.yml` — do not edit them directly
- If you need to add services or override config, create your own file and append it to `COMPOSE_FILE` in your `.env`:

```bash
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml:docker-compose.custom.yml
```

- `docker-compose.custom.yml` is gitignored by default — your extensions stay local and never interfere with upstream updates

---

## Compatibility

This project targets **macOS** and **Debian-based Linux** (Ubuntu, Debian, etc.).

**Windows users:** use [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) with Ubuntu. Docker Desktop for
Windows already requires WSL2, so you likely have it set up — just run everything from inside the WSL2 terminal.

---

## The Problem This Solves

Running multiple web projects — whether on a dev workstation or a remote server — means repeating the same painful
setup every time:

- Configuring a reverse proxy (Nginx, Caddy, or raw Traefik)
- Wiring up SSL certificates and renewals
- Managing Docker networks across projects
- Dealing with firewall rules and port conflicts
- Re-learning DevOps details that have nothing to do with your actual app

This project absorbs all of that complexity once, so every new project you connect just needs a few Docker labels to get
a working URL, HTTPS, and routing — on your workstation or on a remote server.

---

## Roadmap

### Phase 1 — Dev Workstation *(active)*

- Single developer machine
- Multiple projects via `*.localhost` URLs
- Traefik dashboard for visibility
- HTTP only — no SSL needed

### Phase 2 — Remote Server *(in progress)*

The remote context is already a first-class citizen in this project — every architectural decision
accounts for it. `docker-compose.remote.yml` and `traefik/traefik.remote.yml` exist and are maintained
alongside the dev config.

That said, the remote setup has not been battle-tested yet. Expect adjustments when it is put through
its paces — SSL, DNS, firewall, and security hardening will all need validation on a real server.

**Current remote scope:**
- Single server (VPS, dedicated) — not serverless, not multi-instance
- Automatic SSL via Let's Encrypt *(pending)*
- Staging and production environments *(pending)*

> Multi-instance and horizontally scaled architectures are explicitly out of scope. This project targets
> the vast majority of projects that run comfortably on a single server. Large-scale deployments
> introduce enough edge cases that they deserve a dedicated setup.

---

## How It Works

All your projects connect to a single shared Docker network (`local_gateway`). Traefik watches that network and
automatically routes traffic based on labels you add to your services — no central config file to maintain.

```text
[Browser]
    │
    ▼
[Traefik :80 / :443]
    │
    ├──▶ project-a.localhost  →  project-a container
    ├──▶ project-b.localhost  →  project-b container
    └──▶ project-c.localhost  →  project-c container
```

### Compose File Structure

The setup uses Docker Compose's native file merging via `COMPOSE_FILE`:

| File                         | Purpose                       | Committed |
|------------------------------|-------------------------------|-----------|
| `docker-compose.yml`         | Base — image, network, socket | Yes       |
| `docker-compose.dev.yml`     | Dev workstation overrides     | Yes       |
| `docker-compose.remote.yml`  | Remote server overrides       | Yes       |
| `docker-compose.custom.yml`  | Your personal extensions      | No        |

`just init` writes `COMPOSE_FILE` to your `.env` so Docker Compose loads the right files automatically —
no flags needed when running `just up`.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [just](https://github.com/casey/just) — command runner (`brew install just` on macOS)
- [Node.js](https://nodejs.org/) >= 20 — required for the `lgw` CLI (dev workstation only)

---

## Quick Start

### 1. Initialize

For a dev workstation:

```bash
just init
```

For a remote server:

```bash
just init remote
```

This creates `.env`, sets `COMPOSE_FILE`, creates the Docker network, and (dev only) registers
`local-gateway.localhost` in `/etc/hosts`.

### 2. Configure Your Environment

Review `.env` — the defaults are ready for a dev workstation. Adjust ports or dashboard settings as needed.

### 3. Install the CLI *(dev only)*

```bash
just cli-setup
```

This installs dependencies and links `lgw` globally so you can run it from any project.

### 4. Start the Gateway

```bash
just up
```

Run `just` to see all available commands.

### 5. Access the Dashboard *(dev only)*

| Service                        | URL                                                              |
|--------------------------------|------------------------------------------------------------------|
| **Traefik Dashboard**          | [http://local-gateway.localhost](http://local-gateway.localhost) |
| **Traefik Dashboard (direct)** | [http://localhost:8000](http://localhost:8000)                   |

---

## Connecting a Project

From inside any project directory, run:

```bash
lgw add
```

`lgw` will prompt you for the service, domain, and port, patch your `docker-compose.yml`, and register the domain
in `/etc/hosts` — all in one step. After the prompts it prints the equivalent one-liner for CI/CD or scripting:

```bash
lgw add --service app --domain myapp.localhost --port 3000
```

To see all routes currently active in Traefik:

```bash
lgw list
```

> **Without the CLI** — add the labels and network entry manually to your `docker-compose.yml`:
>
> ```yaml
> services:
>   app:
>     labels:
>       - "traefik.enable=true"
>       - "traefik.http.routers.myapp.rule=Host(`myapp.localhost`)"
>       - "traefik.http.services.myapp.loadbalancer.server.port=3000"
>       - "traefik.docker.network=local_gateway"
>     networks:
>       - local_gateway
>
> networks:
>   local_gateway:
>     external: true
> ```

---

## Demos

The `demo/` folder contains ready-to-run examples. See [demo/README.md](demo/README.md) for instructions.

| Demo          | What it shows                                         |
|---------------|-------------------------------------------------------|
| `nginx-ready` | Pre-configured container — starts with `just demo-ready` |
| `nginx-blank` | Bare container — wire it up yourself with `lgw add`   |

---

## Dev Workstation — Hosts File

Most modern systems (macOS, recent Linux distributions) resolve `*.localhost` to loopback automatically —
no hosts file entry needed. `just init` adds `local-gateway.localhost` as a best-effort helper, but it
is not strictly required if your system already handles `.localhost` resolution.

If a domain does not resolve, add it manually:

```bash
sudo nano /etc/hosts
```

```text
127.0.0.1   myapp.localhost # managed by local-gateway
```
