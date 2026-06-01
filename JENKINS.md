# CI/CD Staging dengan Jenkins

Auto-deploy branch `stg` ke `https://stg-coffee.anaki.id` setiap `git push`.

```
git push origin stg → GitHub webhook → Jenkins → ./stg.sh up -d --build → Caddy → live
```

Lihat juga [DEPLOY.md](DEPLOY.md) untuk arsitektur Docker + Caddy. Verifikasi deploy
manual berhasil **sebelum** mengandalkan Jenkins.

---

## 0. Prasyarat (sudah ada di repo ini)

| Hal | Nilai | Catatan |
|-----|-------|---------|
| Branch staging | `stg` | job Jenkins memantau `*/stg` |
| Script deploy | [stg.sh](stg.sh) | `docker compose -p anaki-stg --env-file .env.staging "$@"` |
| Repo | public | Jenkins clone tanpa credentials |
| Domain | `stg-coffee.anaki.id` | sudah ada di `deploy/proxy/Caddyfile` |

> **Penting:** `stg.sh` hanya pembungkus — `./stg.sh` **tanpa argumen tidak deploy apa pun**.
> Selalu beri sub-command: `./stg.sh up -d --build`.

---

## 1. Jenkins di Docker

`~/jenkins-server/docker-compose.yml`:

```yaml
services:
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins
    restart: unless-stopped
    user: root                       # agar bisa pakai docker host
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - ./jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker:ro
      # WAJIB: plugin `docker compose` v2 (kalau tidak, ./stg.sh gagal — lihat Gotcha A)
      - /usr/libexec/docker/cli-plugins/docker-compose:/usr/libexec/docker/cli-plugins/docker-compose:ro
    networks:
      - web                          # agar bisa di-proxy Caddy ke jenkins.anaki.id
networks:
  web:
    external: true
```

```bash
cd ~/jenkins-server && docker compose up -d
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword   # password awal
```

Buka `https://jenkins.anaki.id` → Install suggested plugins → buat akun admin.

### Gotcha A — pastikan `docker compose` jalan di dalam Jenkins

```bash
docker exec jenkins docker compose version
```
- Muncul versi → aman.
- `'compose' is not a docker command` → mount `cli-plugins/docker-compose` (baris di atas) belum benar.
  Cek path host: `ls /usr/libexec/docker/cli-plugins/docker-compose`.

---

## 2. Gotcha B — `.env.staging` tidak ikut Git (rahasia)

Jenkins meng-clone repo ke workspace-nya sendiri, dan `.env.staging` **tidak ada di Git**.
Simpan sebagai **Secret file** di Jenkins:

1. Manage Jenkins → **Credentials** → (global) → **Add Credentials**
2. Kind: **Secret file** → upload `.env.staging` asli → ID: `stg-env-file`

(Template isinya: [.env.staging.example](.env.staging.example))

---

## 3. Job `stg-kopi-keliling` (Freestyle)

| Bagian | Nilai |
|--------|-------|
| **Source Code Management → Git** | URL `https://github.com/aridutomo/kopi-keliling.git`, Credentials `none` |
| **Branch Specifier** | `*/stg` |
| **Build Triggers** | ✅ GitHub hook trigger for GITScm polling |
| **Build Environment** | ✅ Use secret file → Variable `STG_ENV`, Credentials `stg-env-file` |

**Build Steps → Execute shell:**

```bash
cp "$STG_ENV" .env.staging
chmod +x stg.sh
docker network create web 2>/dev/null || true
./stg.sh up -d --build
```

> Build dari workspace Jenkins tetap aman: `-p anaki-stg` membuat docker memakai
> project & volume yang sama (`anaki-stg_mysql_data`), jadi **data staging tidak hilang**
> walau di-deploy dari folder berbeda.

---

## 4. Webhook GitHub

Repo → Settings → Webhooks → Add webhook:

| Field | Nilai |
|-------|-------|
| Payload URL | `https://jenkins.anaki.id/github-webhook/` (garis miring akhir wajib) |
| Content type | `application/json` |
| Events | Just the push event |

---

## 5. Uji

```bash
git checkout stg
# ubah sedikit, lalu:
git commit -am "test ci" && git push origin stg
```
Job di Jenkins akan menyala otomatis → build → `https://stg-coffee.anaki.id` ter-update.

---

## Production (nanti)

Ulangi pola yang sama untuk job `prod-kopi-keliling`:
Branch `*/main`, secret file `.env` (ID `prod-env-file`, Variable `PROD_ENV`), build step
memanggil `./prod.sh up -d --build`. **Jangan** pasang auto-trigger webhook ke prod kalau
ingin rilis manual — jalankan job prod via tombol **Build Now** setelah staging lolos uji.
