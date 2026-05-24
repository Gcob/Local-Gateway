# Skill — Traefik Routing

> To be expanded as routing and middleware patterns are established in this project.

## Key Files

| File                        | Role                                          |
|-----------------------------|-----------------------------------------------|
| `docker-compose.yml`        | Traefik service + `local_gateway` network     |
| `traefik/traefik.yml`       | Static config (entrypoints, dashboard)        |
| `traefik/dynamic_conf.yml`  | Dynamic config (middlewares, routes)          |

## Adding a Route

Routes are defined via **Docker labels** on the target service:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<name>.rule=Host(`<name>.localhost`)"
  - "traefik.http.services.<name>.loadbalancer.server.port=<port>"
  - "traefik.docker.network=local_gateway"
```

## Adding a Middleware

Global middlewares are defined in `traefik/dynamic_conf.yml`.
To apply a middleware to a specific router, use the label:

```yaml
- "traefik.http.routers.<name>.middlewares=<middleware-name>"
```

Middlewares from the file provider must use the `@file` suffix when referenced in Docker labels:

```yaml
- "traefik.http.routers.<name>.middlewares=<middleware-name>@file"
```

## Available Middlewares

| Middleware          | Provider | Description                                |
|---------------------|----------|--------------------------------------------|
| `redirect-to-https` | `@file`  | Redirects HTTP traffic to HTTPS (Phase 2)  |

## Dashboard Security Strategy

- **Local**: dashboard is trusted and unrestricted — it's your machine
- **Server**: set `TRAEFIK_DASHBOARD_ENABLED=false` in `.env` — do not expose it publicly;
  if access is needed, put it behind a VPN or an authenticated reverse proxy
