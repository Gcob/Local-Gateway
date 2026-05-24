default:
    @just --list

# First-time setup: copy .env.example to .env, create the Docker network, and register local-gateway.localhost
init:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f .env ]; then
        cp .env.example .env
        echo ".env created — review it before starting"
    else
        echo ".env already exists, skipping"
    fi
    if docker network inspect "local_gateway" > /dev/null 2>&1; then
        echo "Network 'local_gateway' already exists, skipping"
    else
        docker network create "local_gateway"
        echo "Network 'local_gateway' created"
    fi
    just add-host "local-gateway.localhost"

# Add a 127.0.0.1 entry for a domain in /etc/hosts (idempotent)
add-host domain:
    #!/usr/bin/env bash
    set -euo pipefail
    DOMAIN="{{ domain }}"
    if [[ ! "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]]; then
        echo "Error: invalid domain '${DOMAIN}' — only alphanumeric characters, hyphens, and dots are allowed"
        exit 1
    fi
    ESCAPED="${DOMAIN//./\\.}"
    if grep -qE "(^|[[:space:]])${ESCAPED}([[:space:]]|#|$)" /etc/hosts; then
        echo "'${DOMAIN}' already in /etc/hosts, skipping"
    else
        echo "Adding '${DOMAIN}' to /etc/hosts — sudo password may be required"
        echo "127.0.0.1   ${DOMAIN} # managed by local-gateway" | sudo tee -a /etc/hosts > /dev/null
        echo "'${DOMAIN}' added to /etc/hosts"
    fi

# Start all services
up:
    docker compose up -d

# Stop all services
down:
    docker compose down

# Restart all services
restart:
    docker compose restart

# View logs (follow)
logs:
    docker compose logs -f

# Show running containers status
status:
    docker compose ps

# Deletes all containers and volumes, then restarts everything (useful for a clean slate)
reset:
    docker compose down -v
    docker compose up -d
