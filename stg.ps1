# Staging stack helper.
# Contoh:
#   ./stg.ps1 up -d --build
#   ./stg.ps1 logs -f app
#   ./stg.ps1 ps
#   ./stg.ps1 down
docker compose -p anaki-stg --env-file .env.staging @args
