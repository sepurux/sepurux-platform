#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${SEPURUX_HETZNER_COMPOSE_FILE:-infra/docker-compose.hetzner.yml}"
ENV_FILE="${SEPURUX_HETZNER_ENV_FILE:-infra/.env.hetzner}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull || true
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
