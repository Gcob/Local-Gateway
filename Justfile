default:
    @just --list

# Initialize for dev workstation (default) or remote server: just init [dev|remote]
init env="dev":
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ "{{env}}" != "dev" && "{{env}}" != "remote" ]]; then
        echo "Error: unknown environment '{{env}}' — use 'dev' or 'remote'"
        exit 1
    fi
    COMPOSE_FILE_VALUE="docker-compose.yml:docker-compose.{{env}}.yml"
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "" >> .env
        echo "# Compose files — set by just init, do not edit manually" >> .env
        echo "COMPOSE_FILE=${COMPOSE_FILE_VALUE}" >> .env
        echo ".env created for '{{env}}' environment"
    else
        if grep -qE "^COMPOSE_FILE=" .env; then
            sed -i.bak "s|^COMPOSE_FILE=.*|COMPOSE_FILE=${COMPOSE_FILE_VALUE}|" .env && rm -f .env.bak
        else
            echo "" >> .env
            echo "# Compose files — set by just init, do not edit manually" >> .env
            echo "COMPOSE_FILE=${COMPOSE_FILE_VALUE}" >> .env
        fi
        echo ".env updated for '{{env}}' environment"
    fi
    if docker network inspect "local_gateway" > /dev/null 2>&1; then
        echo "Network 'local_gateway' already exists, skipping"
    else
        docker network create "local_gateway"
        echo "Network 'local_gateway' created"
    fi
    if [[ "{{env}}" == "dev" ]]; then
        just add-host "local-gateway.localhost"
    fi

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

# Tear down all containers and volumes, then start fresh
reset:
    docker compose down -v
    docker compose up -d
