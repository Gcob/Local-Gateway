default:
    @just --list

# First-time setup: copy .env.example to .env and create the Docker network
init:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f .env ]; then
        cp .env.example .env
        echo ".env created — review it before starting"
    else
        echo ".env already exists, skipping"
    fi
    NETWORK=$(grep -E '^DOCKER_NETWORK=' .env 2>/dev/null | cut -d= -f2)
    NETWORK="${NETWORK:-local_gateway}"
    if docker network inspect "$NETWORK" > /dev/null 2>&1; then
        echo "Network '$NETWORK' already exists, skipping"
    else
        docker network create "$NETWORK"
        echo "Network '$NETWORK' created"
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
