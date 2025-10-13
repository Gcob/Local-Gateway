# Traefik + Portainer: Your Local Gateway

This lightweight **Docker setup** uses **Traefik** as a central entry point (reverse proxy) for all your local projects,
and **Portainer** for simplified container management.

---

## Quick Overview

This setup provides:

1. **Traefik (Reverse Proxy)** – Routes web traffic to your containers.

    * **HTTP Access:** Port `80`
    * **Dashboard:** Port `8080` (accessible via `http://localhost:8080` only)

2. **Portainer (Docker Management UI)** – A web interface to manage containers, images, and volumes.

    * **Web Interface:** Port `9000` (accessible via `http://portainer.localhost` or the direct port)

3. **Shared Network** – A single network named `webproxy` connects Traefik to all your local projects.

---

## Quick Start

### 1. Create the Shared Network

This command creates the network used by Traefik and all your future projects:

```bash
docker network create webproxy
```

---

### 2. Start the Gateway

Use the provided `docker-compose.yml` (updated with Portainer and Traefik routing) to launch all services:

```bash
docker compose up -d
```

---

### 3. Access the Interfaces

Once running, you can access both admin interfaces via proxy or direct ports:

| Service                 | Via Proxy                                                | Via Direct Port                                                                                          |
| ----------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Traefik Dashboard**   | *(Not available via traefik.localhost)*                  | [http://localhost:8080](http://localhost:8080)                                                           |
| **Portainer Dashboard** | [http://portainer.localhost](http://portainer.localhost) | [http://localhost:9000](http://localhost:9000) *(you’ll need to create an admin account the first time)* |

---

## How to Connect a Project

To make a new project accessible through Traefik (e.g. `myapp.localhost`):

1. Add the external network `webproxy` to your project’s `docker-compose.yml`.
2. Add **Traefik labels** to your service for your own app (not for the Traefik dashboard).

**Example service (inside your project’s `docker-compose.yml`):**

```yaml
services:
  my_application:
    image: my_custom_image
    # ... other settings
    labels:
      - "traefik.enable=true"
      # The address used to access your app
      - "traefik.http.routers.myapp.rule=Host(`myapp.localhost`)"
      # The internal port your app listens on (e.g. 80, 3000, 5000)
      - "traefik.http.services.myapp.loadbalancer.server.port=80"
    networks:
      - webproxy # VERY IMPORTANT!

networks:
  webproxy:
    external: true
```

Then access your app at:
`http://myapp.localhost`

*Note: The Traefik dashboard is only available at [http://localhost:8080](http://localhost:8080). Access via `traefik.localhost` is no longer supported.*
