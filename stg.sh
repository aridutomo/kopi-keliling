#!/usr/bin/env bash
# Staging stack helper. Contoh: ./stg.sh up -d --build
docker compose -p anaki-stg --env-file .env.staging "$@"
