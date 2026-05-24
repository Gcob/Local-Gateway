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

# Start the pre-configured nginx demo (labels already applied)
demo-ready:
    just add-host "nginx-ready.localhost"
    docker compose -f demo/nginx-ready/docker-compose.yml up -d
    @echo "Demo running at http://nginx-ready.localhost"

# Initialize the nginx-blank demo (copies the template docker-compose.yml)
demo-blank-init:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -f demo/nginx-blank/docker-compose.yml ]; then
        echo "demo/nginx-blank/docker-compose.yml already exists — delete it first to reinitialize"
        exit 1
    fi
    cp demo/nginx-blank/docker-compose.example.yml demo/nginx-blank/docker-compose.yml
    echo "nginx-blank ready — cd demo/nginx-blank && lgw add"

# Stop all running demos
demo-stop:
    -docker compose -f demo/nginx-ready/docker-compose.yml down
    -docker compose -f demo/nginx-blank/docker-compose.yml down

# Install and link the lgw CLI (requires Node.js >= 20)
cli-setup:
    #!/usr/bin/env bash
    set -euo pipefail
    chmod +x cli/bin/lgw.js
    cd cli && npm install && npm link
    echo "lgw installed — run 'lgw --help' to get started"

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
