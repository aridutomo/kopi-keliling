# Production stack helper.
# Contoh:
#   ./prod.ps1 up -d --build
#   ./prod.ps1 logs -f app
#   ./prod.ps1 ps
#   ./prod.ps1 down
docker compose -p anaki-prod --env-file .env @args
