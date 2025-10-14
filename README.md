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
      # To avoid conflicts with other networks, you must specify the network 
      - "traefik.docker.network=webproxy"
    networks:
      - webproxy # VERY IMPORTANT!

networks:
  webproxy:
    external: true
```


## Local Development — Add Domains to Your Hosts File

To make your custom local domains (like `myapp.localhost`, `traefik.localhost`, `portainer.localhost`) work,
you need to **map them to `127.0.0.1`** in your system’s hosts file.

### Add the following lines:

```
127.0.0.1   traefik.localhost
127.0.0.1   portainer.localhost
127.0.0.1   myapp.localhost
```

You can add more entries for any project you expose through Traefik.

---

### On Linux, WSL and MacOS

Edit the hosts file using your preferred editor (with sudo):

```bash
sudo nano /etc/hosts
```

Then paste the lines above and save (`CTRL+O`, `ENTER`, `CTRL+X`).

---

### On Windows

Edit the file located at:

```
C:\Windows\System32\drivers\etc\hosts
```

Open Notepad as **Administrator**, then:

1. Go to **File → Open**
2. Navigate to the path above
3. Select “All Files (*.*)” to see `hosts`
4. Add the same lines and save the file

Flush the DNS cache (optional but recommended):

```powershell
ipconfig /flushdns
```

---

### ✅ Test

After saving, open your browser and check:

* [http://traefik.localhost](http://traefik.localhost)
* [http://portainer.localhost](http://portainer.localhost)
* [http://myapp.localhost](http://myapp.localhost)

If they load successfully, your local DNS routing is working 🎉

*Note: The Traefik dashboard is only available at [http://localhost:8080](http://localhost:8080). Access via `traefik.localhost` is no longer supported.*
