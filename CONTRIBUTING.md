# Contributing to Sepurux

This guide is for team members working on Sepurux.

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11 |
| Docker + Docker Compose | latest |
| Node.js | 18+ |
| `pip` | latest |

## Local Setup

```bash
# 1. Start the full stack
docker compose -f infra/docker-compose.yml up --build

# 2. Run DB migrations
docker compose -f infra/docker-compose.yml exec api alembic upgrade head

# 3. Seed demo data
./seed.sh
```

### Python tooling (for running tests/lint locally)

```bash
pip install -r api/requirements.txt -r worker/requirements.txt
```

### UI (optional, runs standalone)

```bash
cd ui
npm install
npm run dev
```

## Branching

- Branch off `main` for all work.
- Use the format `<type>/<short-description>`, e.g. `feat/ci-gate`, `fix/replay-timeout`.
- Keep branches focused — one feature or fix per branch.
- Delete your branch after it's merged.

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow:

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`, `build`

**Scopes:** `api`, `worker`, `infra`, `ui`, `traces`, `campaigns`, `runs`, `replay`, `mutations`, `eval`, `sdk`

Examples:
```
feat(api): add policy pack versioning endpoint
fix(worker): handle OPA timeout on slow networks
test(replay): cover counterfactual edge cases
```

PR titles are automatically checked against this format — the CI will fail if the title doesn't match.

## Running CI Checks Locally

Run these before opening a PR:

```bash
# Lint
ruff check api/app worker

# Format check
black --check api/app worker

# Type check
mypy api/app worker

# Tests
pytest --cov=api/app --cov=worker --cov-report=term-missing
```

To auto-fix formatting:

```bash
black api/app worker
ruff check --fix api/app worker
```

## Opening a Pull Request

1. Push your branch and open a PR against `main`.
2. Fill in the PR template (what changed, why, how to test).
3. CI must pass: lint, types, tests, migrations check, PR title lint.
4. Get at least one review from a teammate before merging.
5. Squash-merge or merge commit — no force-pushes to `main`.

## Database Migrations

If your change touches the DB schema:

1. Generate a migration: `alembic revision --autogenerate -m "describe change"`
2. Review the generated file in `api/alembic/versions/`.
3. Test upgrade and downgrade locally before opening the PR.
4. The migrations CI check will verify the migration applies cleanly.

## Project Layout

```
api/        FastAPI app + Alembic migrations
worker/     Replay worker, mutation engine, policy engine
ui/         Next.js dashboard
infra/      Docker Compose, OPA policies, Nginx config
site/       Marketing site (standalone Next.js)
scripts/    Dev helper scripts
examples/   GitHub Action usage examples
.github/    CI workflows, PR templates, issue templates
```
