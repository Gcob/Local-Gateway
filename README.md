# Gateway — Traefik for Every Project, Every Environment

Ever wished you could spin up a new web project and have routing, SSL, and networking just *work* — whether on your
laptop or a production server — without touching Nginx configs, fighting SSL certificates, or wrestling with Docker
networking every single time?

That's what this project is.

---

## What Is This?

This is a **meta project** — a shared infrastructure layer that sits alongside all your web projects and handles
everything network-related so you don't have to.

It wraps **Traefik** into a single, reusable setup that works in two contexts:

| Context               | What it means                                                                             |
|-----------------------|-------------------------------------------------------------------------------------------|
| **Local development** | Your dev machine. Multiple projects, clean `*.localhost` URLs, zero config friction.      |
| **Server deployment** | A real server (staging, production). Same setup, real domains, real SSL, proper security. |

The name says "Local" but the scope is both. The `.env` file is what tells the stack which context it's running in — and
that matters a lot, because SSL handling, security headers, firewall rules, and certificate management all behave
differently depending on where you are.

---

## Compatibility

This project targets **macOS** and **Debian-based Linux** (Ubuntu, Debian, etc.).

**Windows users:** use [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) with Ubuntu. Docker Desktop for
Windows already requires WSL2, so you likely have it set up — just run everything from inside the WSL2 terminal.

---

## The Problem This Solves

Running multiple web projects — whether locally or on a server — means repeating the same painful setup every time:

- Configuring a reverse proxy (Nginx, Caddy, or raw Traefik)
- Wiring up SSL certificates and renewals
- Managing Docker networks across projects
- Dealing with firewall rules and port conflicts
- Re-learning DevOps details that have nothing to do with your actual app

This project absorbs all of that complexity once, so every new project you connect just needs a few Docker labels to get
a working URL, HTTPS, and routing — locally or in production.

---

## Roadmap

This project is built in stages. Complexity is added only when it's needed.

### Phase 1 — Local Development *(current)*

- Single developer machine
- Multiple projects via `*.localhost` URLs
- Traefik dashboard for visibility
- No SSL required (HTTP only)

### Phase 2 — Server Deployment *(next)*

- Single server (VPS, dedicated)
- Real domains with automatic SSL via Let's Encrypt
- Production-ready security defaults driven by `.env` context
- Staging and production environments

> **Out of scope for now:** serverless, multi-instance, and horizontally scaled architectures. This project targets the
> vast majority of projects that run comfortably on a single server. Large-scale deployments introduce enough edge cases
> that they deserve their own dedicated setup — that's a future chapter.

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

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [just](https://github.com/casey/just) — command runner (`brew install just` on macOS)

---

## Quick Start

### 1. Initialize

```bash
just init
```

Creates the shared Docker network and copies `.env.example` to `.env`. Safe to run multiple times.

### 2. Configure Your Environment

Open `.env` and set `APP_ENV` to `local` or `server` — this controls SSL, security, and certificate handling.

### 3. Start the Gateway

```bash
just up
```

Run `just` to see all available commands.

### 4. Access the Dashboard

| Service                        | URL                                                              |
|--------------------------------|------------------------------------------------------------------|
| **Traefik Dashboard**          | [http://local-gateway.localhost](http://local-gateway.localhost) |
| **Traefik Dashboard (direct)** | [http://localhost:8000](http://localhost:8000)                   |

---

## Connecting a Project

Add the `local_gateway` network and a few Traefik labels to any service in your project's `docker-compose.yml`:

```yaml
services:
  app:
    image: my-app
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.localhost`)"
      - "traefik.http.services.myapp.loadbalancer.server.port=80"
      - "traefik.docker.network=local_gateway"
    networks:
      - local_gateway

networks:
  local_gateway:
    external: true
```

That's it. No reverse proxy config. No port juggling. No DNS headaches.

---

## Local Development — Hosts File

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
