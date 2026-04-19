# Hetzner CX22 Setup

This guide deploys the current Sepurux app stack on a single Hetzner server with Docker Compose.

**Prefer Coolify as the only public reverse proxy (TLS on 80/443)?** Use
[Coolify migration](coolify-migration.md) and
[`infra/docker-compose.coolify.yml`](../infra/docker-compose.coolify.yml) instead
of the Caddy container below.

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
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_TEAM_MONTHLY`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`

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

Stripe notes:

- `STRIPE_SECRET_KEY` should be your live secret key from Stripe.
- `STRIPE_WEBHOOK_SECRET` should come from the Stripe webhook endpoint you create for Sepurux.
- `STRIPE_PRICE_*` values should be the recurring monthly Stripe Price IDs for `Pro`, `Team`, and `Enterprise`.
- `STRIPE_TOPUP_CENTS_PER_CREDIT=1` means `1000` credits costs `$10.00`. Change this if your credit pricing changes.

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

## 7. Add The Stripe Webhook

In Stripe, create a webhook endpoint pointing to:

```text
https://app.sepurux.dev/api/backend/v1/billing/webhook
```

Subscribe it to at least:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Then copy Stripe's signing secret into:

- `STRIPE_WEBHOOK_SECRET`

## 8. Seed Demo Credentials (Optional)

```bash
docker compose --env-file infra/.env.hetzner -f infra/docker-compose.hetzner.yml exec api \
  python -m app.scripts.seed_local_credentials
```

## 9. Open The App

Visit:

```text
https://sepurux.com
https://app.sepurux.dev
```

## 10. Enable CI/CD (Auto Deploy On Merge To `main`)

This repository includes:

- [.github/workflows/deploy-hetzner.yml](../.github/workflows/deploy-hetzner.yml)
- [infra/scripts/deploy_hetzner.sh](../infra/scripts/deploy_hetzner.sh)

Deploy flow:

1. You merge PR to `main`.
2. GitHub Actions SSHes into your Hetzner server.
3. It checks out the merged commit and runs:
   - `./infra/scripts/deploy_hetzner.sh`
4. Docker Compose rebuilds and restarts the stack.

### 10.1 Required GitHub Secrets

Add these repository secrets:

- `HETZNER_SSH_HOST` (example: `123.123.123.123`)
- `HETZNER_SSH_USER` (example: `deploy`)
- `HETZNER_SSH_PRIVATE_KEY` (private key GitHub Actions uses to SSH to Hetzner)
- `HETZNER_SSH_KNOWN_HOSTS` (`ssh-keyscan -H <host>` output)
- `HETZNER_DEPLOY_PATH` (absolute path of the cloned repo on server, example: `/opt/sepurux`)

### 10.2 One-Time Server Prep

Use a dedicated deploy user:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
```

Add the GitHub Actions public key to:

- `/home/deploy/.ssh/authorized_keys`

Then clone repo as `deploy`:

```bash
sudo -u deploy -H bash -lc '
  cd /opt
  git clone git@github.com:sepurux/sepurux-platform.git sepurux
'
```

Create env file on server once:

```bash
sudo -u deploy -H bash -lc '
  cd /opt/sepurux
  cp infra/.env.hetzner.example infra/.env.hetzner
  nano infra/.env.hetzner
'
```

Important:

- Do not edit app code directly in `/opt/sepurux`; CI/CD will overwrite checked-out revision on deploy.
- Keep secrets only in `infra/.env.hetzner`, not in git.

### 10.3 Add Production Environment (Recommended)

In GitHub:

- Settings -> Environments -> `production`
- Add required reviewers if you want manual approval before deploy.

The workflow already targets `environment: production`.

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
