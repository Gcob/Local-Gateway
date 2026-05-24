# Local Gateway — Traefik

This lightweight **Docker setup** uses **Traefik** as a central reverse proxy for all your local projects.

---

## Quick Overview

- **HTTP Access:** Port `80`
- **Dashboard:** Port `8080` — [http://localhost:8080](http://localhost:8080)
- **Shared Network:** `webproxy` connects Traefik to all your local projects

---

## Quick Start

### 1. Create the Shared Network

```bash
docker network create webproxy
```

### 2. Start the Gateway

```bash
docker compose up -d
```

### 3. Access the Dashboard

| Service               | URL                                             |
| --------------------- | ----------------------------------------------- |
| **Traefik Dashboard** | [http://localhost:8080](http://localhost:8080)  |

---

## How to Connect a Project

To make a new project accessible through Traefik (e.g. `myapp.localhost`):

1. Add the external network `webproxy` to your project's `docker-compose.yml`.
2. Add **Traefik labels** to your service.

**Example:**

```yaml
services:
  my_application:
    image: my_custom_image
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.localhost`)"
      - "traefik.http.services.myapp.loadbalancer.server.port=80"
      - "traefik.docker.network=webproxy"
    networks:
      - webproxy

networks:
  webproxy:
    external: true
```

---

## Local Development — Add Domains to Your Hosts File

Map your custom local domains to `127.0.0.1` in your hosts file:

```
127.0.0.1   myapp.localhost
```

### Linux, WSL and macOS

```bash
sudo nano /etc/hosts
```

### Windows

Edit `C:\Windows\System32\drivers\etc\hosts` as Administrator, then flush DNS:

```powershell
ipconfig /flushdns
```
