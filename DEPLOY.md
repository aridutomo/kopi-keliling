# Deploy ke VPS — Portabel (semua di Docker + Caddy auto-HTTPS)

Pendekatan ini **mudah dipindah server**: tidak ada Nginx/Certbot di host. Semua jalan di
Docker. Pindah server = install Docker → clone repo → salin `.env` → `up`. Sertifikat HTTPS
diterbitkan otomatis oleh Caddy (tidak perlu disalin).

| Env | Domain | Alias proxy | DB | Project Docker |
|-----|--------|-------------|----|----------------|
| Production | `coffee.anaki.id` | `app-prod` | `anaki_coffee` | `anaki-prod` |
| Staging | `stg-coffee.anaki.id` | `app-stg` | `stg_anaki_coffee` | `anaki-stg` |

```
Internet → Caddy (Docker, 80/443) ──network "web"──> app-prod:8080 (prod)
                                                  └─> app-stg:8080  (staging)
```

---

## 1. DNS

Arahkan **A record** kedua domain ke IP VPS:

```
coffee.anaki.id       A   <IP_VPS>
stg-coffee.anaki.id   A   <IP_VPS>
```

Verifikasi: `dig +short coffee.anaki.id` → IP VPS.

---

## 2. Persiapan VPS (Ubuntu/Debian)

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER        # logout/login agar berlaku

# Firewall: cukup SSH + HTTP + HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

> Tidak perlu install Nginx/Certbot — Caddy menangani reverse proxy + HTTPS di dalam Docker.

---

## 3. Ambil kode

```bash
sudo mkdir -p /opt && cd /opt
git clone https://github.com/aridutomo/kopi-keliling.git anaki
cd anaki
```

(Saat diminta, login dengan akun pemilik repo + Personal Access Token. Update nanti: `git pull`.)

---

## 4. File environment (rahasia — tidak ikut git)

Buat secret kuat: `openssl rand -hex 32` (1 untuk prod, 1 untuk staging).

**`.env`** (production):

```bash
cat > .env <<'EOF'
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=GANTI_PASSWORD_KUAT_PROD
DB_NAME=anaki_coffee
MYSQL_ROOT_PASSWORD=GANTI_PASSWORD_KUAT_PROD
DB_HOST_PORT=3306
HOST_PORT=7001
JWT_SECRET=GANTI_HASIL_OPENSSL_1
PROXY_UPSTREAM=app-prod
GIN_MODE=release
EOF
```

**`.env.staging`**:

```bash
cat > .env.staging <<'EOF'
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=GANTI_PASSWORD_KUAT_STG
DB_NAME=stg_anaki_coffee
MYSQL_ROOT_PASSWORD=GANTI_PASSWORD_KUAT_STG
DB_HOST_PORT=3307
HOST_PORT=7002
JWT_SECRET=GANTI_HASIL_OPENSSL_2
PROXY_UPSTREAM=app-stg
GIN_MODE=release
EOF
```

> `DB_PASSWORD` harus sama dengan `MYSQL_ROOT_PASSWORD` (app login sebagai root).

---

## 5. Domain di Caddy

`deploy/proxy/Caddyfile` sudah berisi `coffee.anaki.id` & `stg-coffee.anaki.id`.
(Kalau domain berubah, edit file itu.)

---

## 6. Jalankan semuanya

```bash
# Jaringan bersama (sekali saja per server)
docker network create web

# App stacks
docker compose -p anaki-prod --env-file .env up -d --build
docker compose -p anaki-stg  --env-file .env.staging up -d --build

# Reverse proxy + HTTPS otomatis
cd deploy/proxy && docker compose -p anaki-proxy up -d && cd ../..
```

Tunggu ±30 detik (Caddy mengambil sertifikat Let's Encrypt), lalu buka:
- `https://coffee.anaki.id`      (production)
- `https://stg-coffee.anaki.id`  (staging)

Cek log bila perlu:
```bash
docker compose -p anaki-proxy logs -f     # proses penerbitan TLS
docker compose -p anaki-prod logs -f app
```

---

## 7. Update aplikasi (rebuild)

```bash
cd /opt/anaki && git pull
docker compose -p anaki-prod --env-file .env up -d --build
docker compose -p anaki-stg  --env-file .env.staging up -d --build
# Caddy tidak perlu di-restart kecuali Caddyfile berubah
```

---

## 8. Pindah ke server baru (inti portabilitas)

Di server baru:
```bash
# 1) install Docker (langkah 2)  2) arahkan DNS ke IP server baru
git clone https://github.com/aridutomo/kopi-keliling.git /opt/anaki && cd /opt/anaki
# 3) salin .env & .env.staging (scp dari server lama / catatan aman)
docker network create web
docker compose -p anaki-prod --env-file .env up -d --build
docker compose -p anaki-stg  --env-file .env.staging up -d --build
cd deploy/proxy && docker compose -p anaki-proxy up -d
```
Caddy menerbitkan ulang sertifikat otomatis (DNS sudah menunjuk ke IP baru).
Database ada di volume Docker — untuk memindahkan data, backup & restore (di bawah).

---

## Backup & restore database

```bash
# Backup (prod) — $PW = password DB prod
docker exec anaki-prod-mysql-1 mysqldump -uroot -p"$PW" anaki_coffee > backup_prod.sql

# Restore di server baru (setelah stack jalan)
cat backup_prod.sql | docker exec -i anaki-prod-mysql-1 mysql -uroot -p"$PW" anaki_coffee
```

---

## Catatan

- **Ganti password admin** (default `admin` / `admin123`) setelah login pertama.
- Isi kontak asli di `frontend/src/config/business.js` sebelum build.
- QRIS: `frontend/public/qris.jpeg` (ikut repo) tampil di pembayaran QRIS.
- Alternatif proxy tanpa Docker (Nginx host + Certbot) ada di `deploy/nginx/` — **kurang portabel**.

## Troubleshooting

- **Caddy gagal TLS** → pastikan DNS sudah ke IP VPS, port 80 & 443 terbuka, domain di
  `deploy/proxy/Caddyfile` benar. Lihat `docker compose -p anaki-proxy logs`.
- **502 dari Caddy** → app belum healthy / `PROXY_UPSTREAM` tak cocok dengan Caddyfile
  (`app-prod` & `app-stg`). Cek `docker ps`.
- **App restart / DB error** → `DB_PASSWORD` harus = `MYSQL_ROOT_PASSWORD`. Bila volume MySQL
  sudah ter-init password lain: `docker compose -p anaki-prod down -v` (HAPUS data) lalu `up`.
