# LaunchControl

A lightweight feature flag service for managing feature flags, evaluating targeting rules, and controlling percentage rollouts through an HTTP API.

LaunchControl answers a simple question:

> For this user, is this feature flag ON or OFF right now, and why?

## Features

- Create, retrieve, update, enable, disable, and archive feature flags.
- Evaluate feature flags for a user context.
- Support targeting conditions and percentage-based rollouts.
- Provide evaluation reasons and a debug evaluation endpoint.
- Maintain audit logs for flag changes.
- Protect administrative operations with a configured admin token.
- Validate environment configuration at startup.
- Apply database migrations through Docker Compose before starting the API.
- Expose a health endpoint that checks API and database availability.
- Apply API rate limiting and request validation.

## Technology Stack

- **Backend:** NestJS, TypeScript, Node.js
- **Database:** PostgreSQL
- **ORM and migrations:** Prisma ORM
- **Validation:** Zod
- **Testing:** Vitest
- **Containerization:** Docker, Docker Compose

## Architecture

```text
Client / Admin
      |
      v
  NestJS API
      |
      +---- Feature Flag Management
      |
      +---- Evaluation Engine
      |
      +---- Authentication and Validation
      |
      v
  Prisma ORM
      |
      v
  PostgreSQL

Docker Compose:
PostgreSQL healthy
      |
      v
Database migrations
      |
      v
API startup
```

## Prerequisites

For local development:

- Node.js 24
- npm
- PostgreSQL 17, or Docker with Docker Compose

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/imtiazsakib15/LaunchControl.git
cd LaunchControl
```

### 2. Configure the backend

```bash
cd backend
npm ci
```

Create a local `.env` file using the example:

```bash
copy .env.example .env
```

Configure the required environment variables:

| Variable       | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection URL                      |
| `ADMIN_TOKEN`  | Secret token for administrative API access     |
| `NODE_ENV`     | Runtime environment; use `development` locally |

Use a strong, unique token for any shared or production environment. Never commit `.env` or expose secrets in logs, screenshots, or source control.

### 3. Start PostgreSQL

If using the repository's Docker Compose configuration, return to the project root:

```bash
cd ..
docker compose up -d postgres
```

Wait until PostgreSQL reports healthy:

```bash
docker compose ps
```

### 4. Apply database migrations

From the project root:

```bash
docker compose run --rm migrate
```

Alternatively, if running the backend directly with a locally accessible PostgreSQL database, run this from `backend`:

```bash
npm run db:deploy
```

### 5. Start the API

From `backend`:

```bash
npm run start:dev
```

The default development port is configured by the application. Check the application configuration if it differs from `3000`.

## Docker Deployment

The root `docker-compose.yml` defines the PostgreSQL, migration, and API services.

Start the stack:

```bash
docker compose up -d --build
```

Check service status:

```bash
docker compose ps -a
```

Inspect migration logs:

```bash
docker compose logs migrate
```

Inspect API logs:

```bash
docker compose logs api
```

The API depends on PostgreSQL becoming healthy and the migration service completing successfully. A failed migration should prevent the API service from starting through this dependency chain.

Check API health:

```bash
curl http://localhost:3000/health
```

A successful response should report API and database health.

To stop the services without deleting persistent database data:

```bash
docker compose down
```

Do not use `docker compose down -v` unless you intentionally want to remove the Compose-managed database volume.

## API Overview

Base path: `/api/v1`

| Method   | Endpoint              | Purpose                             |
| -------- | --------------------- | ----------------------------------- |
| `POST`   | `/flags`              | Create a flag                       |
| `GET`    | `/flags`              | List flags                          |
| `GET`    | `/flags/:key`         | Retrieve a flag                     |
| `PATCH`  | `/flags/:key`         | Update a flag                       |
| `POST`   | `/flags/:key/disable` | Disable a flag                      |
| `POST`   | `/flags/:key/enable`  | Enable a flag                       |
| `DELETE` | `/flags/:key`         | Archive a flag                      |
| `POST`   | `/evaluate`           | Evaluate a flag                     |
| `POST`   | `/evaluate/debug`     | Evaluate with debugging information |

Administrative endpoints require the configured admin token. Use the authentication header and request schemas implemented by the API; do not assume that every endpoint uses the same authorization requirements.

### Health

```http
GET /health
```

Checks application availability and database connectivity.

## Development Commands

Run these commands from `backend`:

| Command             | Purpose                  |
| ------------------- | ------------------------ |
| `npm run start:dev` | Start development server |
| `npm run build`     | Compile the application  |
| `npm test`          | Run the Vitest suite     |
| `npm run test:e2e`  | Run the E2E test suite   |
| `npm run lint`      | Run Oxlint               |
| `npm run db:status` | Check migration status   |
| `npm run db:deploy` | Apply pending migrations |

## Database Migrations

Prisma migrations are maintained in:

```text
backend/prisma/migrations/
```

Create and review schema migrations during development using the project's established Prisma workflow. Deploy existing migrations with:

```bash
npm run db:deploy
```

For Docker deployments, the dedicated migration service runs `prisma migrate deploy` before the API starts.

Back up the database before production schema changes. Test migration and recovery procedures against a non-production database first.

## Security Considerations

- Keep `ADMIN_TOKEN` secret and use a strong, randomly generated value.
- Do not commit `.env` files or credentials.
- Use HTTPS when exposing the API outside a trusted local network.
- Restrict database network access and use managed secrets in production.
- Configure appropriate CORS origins before exposing the service to browser clients.
- Back up PostgreSQL and test restoration procedures.
- Review logs for accidental secret exposure.
- Test migrations and rollback/recovery procedures before production deployment.

## Current Scope

LaunchControl focuses on core flag management, evaluation, targeting, percentage rollouts, audit logging, and deployment fundamentals.

Multi-organization authentication, multiple environments, advanced segmentation, scheduled rollouts, Redis-based caching, real-time updates, and A/B testing are outside the current scope.

## License

Add the project's intended license before distributing or publishing it for reuse.
