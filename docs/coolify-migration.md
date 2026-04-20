# Migrate Sepurux from Caddy to Coolify (recommended)

This moves **TLS and HTTP routing** from the standalone `caddy` container in
`infra/docker-compose.hetzner.yml` to **Coolify’s built-in reverse proxy**, so
only one stack owns host ports **80** and **443**. After this, you can add other
apps (e.g. Hireoven) on the same server without port conflicts.

## What stays the same

- Same Docker services: `postgres`, `redis`, `minio`, `opa`, `api`, `worker`,
  `scheduler`, `site`, `ui`.
- Same env file: reuse `infra/.env.hetzner` (or copy to Coolify env UI). Values
  in `infra/.env.hetzner.example` still apply.
- **Do not** publish `5432`, `6379`, `9000`, `9001`, or `8181` publicly.

## What you replicate from `infra/Caddyfile`

| Caddy behavior | Coolify action |
|----------------|----------------|
| `SITE_DOMAIN` → `site:3000` | Attach **SITE_DOMAIN** to service **`site`**, port **3000** |
| `APP_DOMAIN` → `ui:3000` | Attach **APP_DOMAIN** to service **`ui`**, port **3000** |
| `SITE_WWW_DOMAIN` → 301 → `https://SITE_DOMAIN{uri}` | Add **redirect** from www host to apex (preserve path if the UI offers “path preserve”; otherwise redirect `/` only and test deep links) |
| `APP_ALT_DOMAIN` → 301 → `https://APP_DOMAIN{uri}` | Add **redirect** from alt host to canonical app domain |

Default domains from the example env:

- Marketing: `sepurux.com` (`site`)
- App: `app.sepurux.dev` (`ui`)
- Redirects: `www.sepurux.com` → `sepurux.com`, `sepurux.dev` → `app.sepurux.dev`

## Prerequisites

1. **Hetzner firewall**: allow `22`, `80`, `443` only (unchanged).
2. **DNS**: `A` records for all hostnames still point at the same server IP.
3. **Coolify** installed on the server (Coolify owns `80/443` after cutover).
4. **Maintenance window** (optional but wise): 5–15 minutes while you stop old
   Caddy and bring the Coolify-backed stack up.

## Compose file to use in Coolify

Use **`infra/docker-compose.coolify.yml`**: identical stack to
`docker-compose.hetzner.yml` but **without** the `caddy` service (no host
`80/443` binding from this compose).

## Coolify: create the Docker Compose project

1. In Coolify: **New resource** → **Docker Compose** (wording may be “Compose”
   or “Docker Compose stack”).
2. Connect the **Crash-Lab / Sepurux** GitHub repo and the branch you deploy
   from (e.g. `main`).
3. Set **base directory** (or “compose file path”) so Coolify runs compose from
   repo **`infra/`** with file **`docker-compose.coolify.yml`**  
   (so build contexts like `../api` resolve to repo-root `api/`, `ui/`, `site/`,
   `worker/`).
4. Paste or sync **all** variables from `infra/.env.hetzner` into Coolify’s
   environment for that compose stack.  
   **`LETSENCRYPT_EMAIL`** is no longer consumed by Caddy here; Coolify uses its
   own ACME account — still set an admin email in Coolify for certificates.
5. **Deploy** the compose stack once (internal network only; no public edge on
   this compose yet until domains are attached — exact behavior depends on
   Coolify version; if the UI asks for a domain per service, configure below
   before exposing).

## Coolify: attach domains (replace with your real FQDNs)

### Service `site` (marketing)

- Domain: **`SITE_DOMAIN`** (e.g. `https://sepurux.com`)
- Internal port: **3000**
- Enable **HTTPS** / Let’s Encrypt in Coolify.

### Service `ui` (product)

- Domain: **`APP_DOMAIN`** (e.g. `https://app.sepurux.dev`)
- Internal port: **3000**
- Enable **HTTPS**.

### Redirects (match Caddy)

Add in Coolify (Redirects / Middleware / “Additional domains” — name varies by
version):

1. **Host** `SITE_WWW_DOMAIN` → permanent redirect to `https://SITE_DOMAIN`  
   Prefer **path-preserving** redirect if available (`{uri}` equivalent).
2. **Host** `APP_ALT_DOMAIN` → permanent redirect to `https://APP_DOMAIN`  
   Same as above.

If Coolify only supports “redirect to URL” without path, test:

- `https://www.sepurux.com/some/path` → should land on marketing with same path
  or an acceptable fallback.

## Cutover sequence (minimize downtime)

1. **Do not** delete old volumes: keep `pgdata` / `miniodata` by reusing the same
   Coolify **project** name and volume names if Coolify maps named volumes to
   the host — **first deploy on Coolify**: if this is a *new* stack on the same
   machine, you must **migrate data** from old Postgres volume to new one, OR
   mount the existing volume (advanced). Safest path: **migrate on a clone** or
   **dump/restore** Postgres if volume names change.  
   If you are **replacing** the same server directory layout and Coolify runs
   compose from the same host path with identical volume names, Docker may reuse
   `pgdata` — verify in Coolify’s volume UI before relying on this.
2. Deploy the **Coolify compose** stack and confirm **internal** health: `api`
   logs, `ui` and `site` respond when hit via Coolify preview URL or temporary
   route.
3. Attach **domains + redirects** as above; wait for **TLS OK**.
4. **Stop** the old stack that included Caddy:
   ```bash
   cd /path/to/old/compose && docker compose -f docker-compose.hetzner.yml down
   ```
   This frees `80/443` if Caddy was the only publisher.
5. Confirm Coolify proxy is listening on `80/443` and Sepurux URLs work end-to-end
   (login, OAuth callbacks, Stripe webhooks, uploads).

## OAuth and Stripe checklist

- **GitHub / Google / Microsoft**: redirect URIs must match **`APP_PUBLIC_URL`**
  (and paths your app registers).
- **Stripe webhooks**: endpoint URL must match the **public** API URL your app
  exposes (often `APP_PUBLIC_URL`-relative path). If webhooks target a
  dedicated host, update in Stripe dashboard.
- **`CORS_ALLOW_ORIGINS`**: must include every browser origin you use (`APP_DOMAIN`,
  `SITE_DOMAIN`, etc.).

## After Sepurux is stable on Coolify

- Add **Hireoven** as a separate Coolify **Application** (Next.js) with its own
  domain; no Caddy compose on the host.
- Keep Sepurux on **Docker Compose in Coolify**; keep Hireoven as a **normal
  app** — both share Coolify’s single edge.

## Rollback

If something goes wrong: bring the old `docker-compose.hetzner.yml` (with Caddy)
back up and `docker compose up -d`, and temporarily **detach** domains in Coolify
or stop Coolify’s proxy — only one system should bind `80/443`.

## Postgres data on a new server

Coolify creates a **new** `pgdata` volume unless you explicitly reuse old storage.
To copy production data from the previous box, follow
[postgres-migrate-to-coolify.md](./postgres-migrate-to-coolify.md).

## Files

- Compose without Caddy: [`../infra/docker-compose.coolify.yml`](../infra/docker-compose.coolify.yml)
- Original Hetzner + Caddy: [`../infra/docker-compose.hetzner.yml`](../infra/docker-compose.hetzner.yml)
- Caddy rules reference: [`../infra/Caddyfile`](../infra/Caddyfile)
