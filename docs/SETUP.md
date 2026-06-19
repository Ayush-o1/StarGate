# Setup Guide — Stargate

This guide covers local development setup, Docker-based full-stack setup, and common troubleshooting steps.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime for API, Worker, Web build |
| pnpm | 9+ | Package manager for monorepo |
| Docker | Any recent | Runs Postgres and Redis locally |
| Docker Compose | V2 (comes with Docker Desktop) | Orchestrates all services |

Install pnpm if you don't have it:
```bash
npm install -g pnpm
```

---

## Option A — Local Development (Recommended for Development)

This runs Postgres and Redis in Docker, but runs the API, Worker, and Web directly on your machine for fast iteration.

### Step 1 — Clone and install

```bash
git clone <repo-url> stargate
cd stargate
pnpm install
```

### Step 2 — Start infrastructure

```bash
# Start only Postgres and Redis via Docker
docker compose up postgres redis -d
```

Ports:
- Postgres: `localhost:5433` (note: mapped from 5432 inside the container to 5433 on host to avoid conflicts)
- Redis: `localhost:6379`

### Step 3 — Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work for the docker-compose setup. Open `.env` and verify:

```env
DATABASE_URL="postgresql://stargate:password@localhost:5433/stargate_dev?schema=public"
JWT_ACCESS_SECRET="any-long-random-string"
JWT_REFRESH_SECRET="another-long-random-string"
REDIS_HOST=localhost
REDIS_PORT=6379
VITE_API_URL=http://localhost:3000
```

**Important**: `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be set to something. They can be any long random strings in development. Never use the example values in production.

### Step 4 — Run database migrations

```bash
cd packages/database
pnpm exec prisma migrate dev --name init
cd ../..
```

This creates all 10 tables in the Postgres database.

### Step 5 — Start all apps

From the root of the repository:
```bash
pnpm dev
```

Turborepo starts all three apps in parallel:
- **API** — `http://localhost:3000`
- **Worker** — no port, connects to Redis and listens for jobs
- **Web** — `http://localhost:5173`

Or start apps individually:
```bash
# Terminal 1 — API
cd apps/api && pnpm dev

# Terminal 2 — Worker
cd apps/worker && pnpm dev

# Terminal 3 — Web
cd apps/web && pnpm dev
```

### Step 6 — Verify

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"api":"healthy","worker":"healthy","redis":"healthy","database":"healthy"}
```

Open `http://localhost:5173` in the browser and register an account.

---

## Option B — Full Docker Compose

Builds and runs all five services (Postgres, Redis, API, Worker, Web) in containers.

```bash
# Build images and start all services
docker compose up --build

# Or in detached mode
docker compose up --build -d
```

This uses the `Dockerfile` in each app folder. The build context is the monorepo root so Turborepo can resolve shared packages.

### Verify all containers are running

```bash
docker compose ps
```

Expected: `stargate-postgres-1`, `stargate-redis-1`, `stargate-api-1`, `stargate-worker-1`, `stargate-web-1` — all `Up`.

### Access URLs (Docker)

| Service | URL |
|---|---|
| Web UI | `http://localhost:5173` |
| API | `http://localhost:3000` |
| Health check | `http://localhost:3000/health` |

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f worker
```

### Stop all services

```bash
docker compose down

# Also remove volumes (clears database)
docker compose down -v
```

---

## Database Commands

All Prisma commands run from `packages/database/`:

```bash
cd packages/database

# Create a new migration after schema changes
pnpm exec prisma migrate dev --name describe_your_change

# Apply migrations in production
pnpm exec prisma migrate deploy

# Reset database (drops all data, re-runs migrations)
pnpm exec prisma migrate reset

# Open the Prisma visual browser
pnpm exec prisma studio

# Regenerate the Prisma client (after schema changes)
pnpm exec prisma generate
```

### Connect to Postgres directly

```bash
# When running via docker compose
docker exec -it stargate-postgres-1 psql -U stargate -d stargate_dev

# Or using psql locally (if installed)
psql "postgresql://stargate:password@localhost:5433/stargate_dev"
```

Useful SQL queries:
```sql
-- See all tables
\dt

-- Check users
SELECT id, email, name FROM "User";

-- Check workflow executions
SELECT id, status, "durationMs", "retryCount" FROM "WorkflowExecution" ORDER BY "createdAt" DESC LIMIT 10;

-- Check node execution results
SELECT "nodeId", status, output, error FROM "NodeExecution" WHERE "workflowExecutionId" = '<id>';
```

---

## Build for Production

```bash
# Build all apps
pnpm build

# Build a specific app
cd apps/api && pnpm build
cd apps/worker && pnpm build
cd apps/web && pnpm build
```

The web app builds to `apps/web/dist/` as a static site served by nginx inside Docker.

---

## Environment Variables Reference

| Variable | Required by | Description |
|---|---|---|
| `DATABASE_URL` | API, Worker | Prisma connection string |
| `JWT_ACCESS_SECRET` | API | Secret for signing 15-minute access tokens |
| `JWT_REFRESH_SECRET` | API | Secret for signing 7-day refresh tokens |
| `REDIS_HOST` | API, Worker | Redis hostname (default: `localhost`) |
| `REDIS_PORT` | API, Worker | Redis port (default: `6379`) |
| `PORT` | API | HTTP server port (default: `3000`) |
| `NODE_ENV` | All | `development` or `production` |
| `VITE_API_URL` | Web (build time) | Base URL for API calls |
| `ALLOW_LOCAL_REQUESTS` | Worker | Set `true` to disable SSRF guard (development only) |

---

## Troubleshooting

### "Connection refused" on Postgres port 5433

The docker-compose maps Postgres's internal port 5432 to host port **5433** to avoid conflicts with any locally installed Postgres. Make sure your `DATABASE_URL` uses port `5433`:
```
DATABASE_URL="postgresql://stargate:password@localhost:5433/stargate_dev?schema=public"
```

### Worker shows as "unhealthy" on `/health`

The health check looks for active BullMQ worker processes registered on the queue. If the worker process hasn't started yet or crashed, it shows unhealthy. Check worker logs:
```bash
docker compose logs worker
# or
cd apps/worker && pnpm dev
```

### Cron triggers not firing

The cron scheduler (`node-cron`) runs in-process inside the API. Schedules are loaded on API startup by calling `schedulerService.loadSchedules()`. If you restart the API, all active SCHEDULE triggers are re-loaded automatically from the database. If a trigger was created while the API was running, it is registered immediately via `addOrUpdateSchedule()`.

### "Workflow validation failed" when running

The validator checks:
1. No cycles in the graph
2. No edges pointing to non-existent nodes
3. HTTP nodes have a non-empty URL
4. IF nodes have a non-empty expression
5. Variable references (`{{nodeId.field}}`) point to nodes that exist and are upstream

Check the error message returned by `POST /workflows/:id/run` for the specific issue.

### SSRF error when calling an external API

If you get `"SSRF blocked: Host X is forbidden"`, the URL you configured in an HTTP node resolved to a private IP address. This is intentional for security. In development, you can bypass this by setting `ALLOW_LOCAL_REQUESTS=true` in your `.env`.

### Frontend can't reach the API

Check that `VITE_API_URL` in your `.env` matches where the API is running:
- Local dev: `VITE_API_URL=http://localhost:3000`
- Docker compose (web container talks to api container): the Docker Compose file handles this via service names internally

Note: In the current frontend code (`apps/web/src/lib/api.ts`), the API base URL is hardcoded as `http://localhost:3000/api/v1`. If you change the API port, update this file.

### Prisma Client out of sync

If you change the schema and get TypeScript errors about missing fields:
```bash
cd packages/database
pnpm exec prisma generate
```

Then restart your dev server.

### pnpm can't resolve workspace packages

Make sure you're running `pnpm install` from the monorepo root (where `pnpm-workspace.yaml` is). Never run `npm install` inside individual apps.

---

## Seeding Test Data

A basic seed script exists at `apps/api/seed.js`. To run it:
```bash
cd apps/api
node seed.js
```

There is also a Prisma seed at `packages/database/src/seed.ts` (to be verified against actual content).

---

## Running TypeScript Type Checks

```bash
# Check all apps
pnpm typecheck

# Check a specific app
cd apps/api && pnpm typecheck
```

---

## Linting

```bash
# Lint all apps
pnpm lint

# Lint a specific app
cd apps/api && pnpm lint
```
