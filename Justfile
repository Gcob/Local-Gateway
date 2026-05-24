default:
    @just --list

# First-time setup: create the Docker network and copy .env.example to .env
init:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f .env ]; then
        cp .env.example .env
        echo ".env created — review it before starting, then run 'just up'"
    else
        echo ".env already exists, skipping"
    fi
    docker network create local_gateway 2>/dev/null || echo "Network 'local_gateway' already exists, skipping"

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
