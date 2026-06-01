#!/usr/bin/env bash
# Production stack helper. Contoh: ./prod.sh up -d --build
docker compose -p anaki-prod --env-file .env "$@"
