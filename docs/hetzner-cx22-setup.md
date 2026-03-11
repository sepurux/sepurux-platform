# Hetzner CX22 Setup

This guide deploys the current Sepurux app stack on a single Hetzner server with Docker Compose.

It uses:

- [infra/docker-compose.hetzner.yml](../infra/docker-compose.hetzner.yml)
- [infra/Caddyfile](../infra/Caddyfile)
- [infra/.env.hetzner.example](../infra/.env.hetzner.example)

## What This Deploys

This deploys the current app stack:

- `site`
- `ui`
- `api`
- `worker`
- `postgres`
- `redis`
- `minio`
- `opa`

It uses this domain split by default:

- `sepurux.com` -> marketing site
- `www.sepurux.com` -> redirect to `sepurux.com`
- `app.sepurux.dev` -> product app
- `sepurux.dev` -> redirect to `app.sepurux.dev`

## 1. Create The Server

- Create an Ubuntu 24.04 server on Hetzner.
- Point these DNS `A` records to the server IP:
  - `sepurux.com`
  - `www.sepurux.com`
  - `sepurux.dev`
  - `app.sepurux.dev`
- In the Hetzner firewall, allow only `22`, `80`, and `443`.

Do not expose `5432`, `6379`, `9000`, `9001`, or `8181` publicly.

## 2. Install Docker

SSH into the box and run:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git
sudo usermod -aG docker $USER
```

Log out and back in once so `docker` works without `sudo`.

## 3. Add Swap (Recommended On CX22)

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify:

```bash
free -h
```

## 4. Clone The Repo

```bash
git clone <your-repo-url> sepurux
cd sepurux
```

## 5. Create The Hetzner Env File

```bash
cp infra/.env.hetzner.example infra/.env.hetzner
```

Update at least:

- `LETSENCRYPT_EMAIL`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `MINIO_ROOT_PASSWORD`
- `S3_SECRET_KEY`
- `CORS_ALLOW_ORIGINS`

Review:

- `SITE_DOMAIN`
- `SITE_WWW_DOMAIN`
- `APP_DOMAIN`
- `APP_ALT_DOMAIN`
- `SITE_PUBLIC_URL`
- `APP_PUBLIC_URL`

Keep:

- `INTERNAL_API_BASE_URL=http://api:8000`
- `NEXT_PUBLIC_API_BASE_URL=http://api:8000`

The UI detects the internal `api` hostname in the browser and switches to its built-in `/api/backend` proxy automatically.

## 6. Start The Stack

```bash
docker compose --env-file infra/.env.hetzner -f infra/docker-compose.hetzner.yml up -d --build
```

Check container status:

```bash
docker compose --env-file infra/.env.hetzner -f infra/docker-compose.hetzner.yml ps
```

Tail logs:

```bash
docker compose --env-file infra/.env.hetzner -f infra/docker-compose.hetzner.yml logs -f
```

## 7. Seed Demo Credentials (Optional)

```bash
docker compose --env-file infra/.env.hetzner -f infra/docker-compose.hetzner.yml exec api \
  python -m app.scripts.seed_local_credentials
```

## 8. Open The App

Visit:

```text
https://sepurux.com
https://app.sepurux.dev
```

## CX22 Note

The CX22 can run this stack for testing and low traffic, but it is tight for production because one box is carrying:

- the database
- Redis
- MinIO
- OPA
- the API
- the worker
- the Next.js UI

If memory pressure becomes a problem, the first upgrade should be a larger Hetzner instance.
