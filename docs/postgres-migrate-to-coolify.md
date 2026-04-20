# Migrate Postgres into Coolify (Crash-Lab / Sepurux)

Move data from the **old** server’s `postgres` container to the **new** Coolify stack’s `postgres` service. Default DB name in examples: **`crashlab`** (see `POSTGRES_DB` in `infra/.env.hetzner`).

## Before you start

1. **Maintenance window** — expect a few minutes of read-only or downtime if you must stop writers.
2. **Same Postgres major version** — old and new both use **Postgres 16** in compose; if either differs, prefer `pg_dump` / `pg_restore` from the **newer** client.
3. **Secrets** — use the **same** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DATABASE_URL` on Coolify as on the old box **or** update Coolify env after restore to match the dump.
4. **MinIO / uploads** — this guide is **Postgres only**. If you need files in MinIO, migrate buckets separately (`mc mirror` or MinIO replicate).

---

## 1) On the **old** server — find the Postgres container

```bash
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i postgres
```

Pick the container running **`postgres:16`** for your Sepurux stack (name might be `infra-postgres-1`, `postgres-1`, etc.). Below it is called **`OLD_PG`**.

Set variables (edit to match **old** `.env.hetzner`):

```bash
export OLD_PG="REPLACE_CONTAINER_NAME"
export PGUSER="crashlab"
export PGPASSWORD="REPLACE_OLD_PASSWORD"
export PGDATABASE="crashlab"
```

### Custom-format dump (recommended)

```bash
docker exec -e PGPASSWORD="$PGPASSWORD" "$OLD_PG" \
  pg_dump -U "$PGUSER" -d "$PGDATABASE" -Fc -f /tmp/crashlab.dump
docker cp "$OLD_PG":/tmp/crashlab.dump ./crashlab-$(date +%F).dump
```

You now have `crashlab-YYYY-MM-DD.dump` on the old host’s current directory.

### Plain SQL fallback

```bash
docker exec -e PGPASSWORD="$PGPASSWORD" "$OLD_PG" \
  pg_dump -U "$PGUSER" -d "$PGDATABASE" --no-owner --no-acl \
  > crashlab-$(date +%F).sql
```

---

## 2) Copy the dump to the **new** server

From your **laptop** (or old server):

```bash
scp -i ~/.ssh/your_key ./crashlab-YYYY-MM-DD.dump root@NEW_SERVER_IP:/root/
```

---

## 3) On the **new** server — find the Coolify Postgres container

```bash
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i postgres
```

Pick the **`postgres:16`** container for the Crash-Lab compose. Below it is **`NEW_PG`**.

Copy the file into the container:

```bash
export NEW_PG="REPLACE_NEW_CONTAINER_NAME"
docker cp /root/crashlab-YYYY-MM-DD.dump "$NEW_PG":/tmp/crashlab.dump
```

Set password to match **Coolify** env for this stack:

```bash
export PGPASSWORD="REPLACE_NEW_PASSWORD"
export PGUSER="crashlab"
export PGDATABASE="crashlab"
```

---

## 4) Restore (empty target DB)

If Coolify already started **api** migrations against an **empty** DB, you can usually restore **over** it by dropping and recreating the database (destructive on **new** only).

**Option A — drop + recreate DB, then restore (custom format)**

```bash
# Terminate connections, drop DB, recreate (run inside NEW_PG)
docker exec -e PGPASSWORD="$PGPASSWORD" -it "$NEW_PG" \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$PGDATABASE' AND pid <> pg_backend_pid();"
docker exec -e PGPASSWORD="$PGPASSWORD" -it "$NEW_PG" \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$PGDATABASE\";"
docker exec -e PGPASSWORD="$PGPASSWORD" -it "$NEW_PG" \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$PGDATABASE\" OWNER \"$PGUSER\";"

docker exec -e PGPASSWORD="$PGPASSWORD" -it "$NEW_PG" \
  pg_restore -U "$PGUSER" -d "$PGDATABASE" --no-owner --no-acl --exit-on-error /tmp/crashlab.dump
```

If restore errors on **extensions** or **roles**, paste the first error line — fixes are usually `CREATE EXTENSION` as superuser or `--no-owner` tweaks.

**Option B — plain SQL file**

```bash
docker cp /root/crashlab-YYYY-MM-DD.sql "$NEW_PG":/tmp/crashlab.sql
docker exec -e PGPASSWORD="$PGPASSWORD" -it "$NEW_PG" \
  psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS \"$PGDATABASE\" WITH (FORCE);"
docker exec -e PGPASSWORD="$PGPASSWORD" -it "$NEW_PG" \
  psql -U postgres -d postgres -c "CREATE DATABASE \"$PGDATABASE\" OWNER \"$PGUSER\";"
docker exec -e PGPASSWORD="$PGPASSWORD" -it "$NEW_PG" \
  psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f /tmp/crashlab.sql
```

---

## 5) Restart app tier and verify

In **Coolify**, **Restart** the stack (or at least **`api`**, **`worker`**, **`scheduler`**, **`ui`**, **`site`**).

Check:

```bash
docker exec -e PGPASSWORD="$PGPASSWORD" "$NEW_PG" \
  psql -U "$PGUSER" -d "$PGDATABASE" -c "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');"
```

Log into the product and confirm real data (users, orgs, etc.).

---

## 6) Re-run migrations if needed

Your **`api`** container already runs `alembic upgrade head` on start. After a restore, that is usually **idempotent** (no-op if DB already at head). If Alembic complains, capture logs from **`api`** and fix version table vs migration state (case-by-case).

---

## Rollback

Keep the **`crashlab-*.dump`** file until production is stable for several days. You can re-restore to a fresh volume if something goes wrong.

---

## Related

- Coolify cutover: [coolify-migration.md](./coolify-migration.md)
- Env reference: [../infra/.env.hetzner.example](../infra/.env.hetzner.example)
