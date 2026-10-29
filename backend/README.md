# LaunchControl — Backend

The NestJS API for LaunchControl, a feature flag management and evaluation service.

## Requirements

- Node.js 24
- npm
- PostgreSQL 17

## Setup

```bash
npm ci
copy .env.example .env
```

Configure `DATABASE_URL`, `ADMIN_TOKEN`, and `NODE_ENV` in `.env`.

Ensure PostgreSQL is running and the database exists before applying migrations.

## Development

```bash
npm run start:dev
```

## Build and Verification

```bash
npm test
npm run test:e2e
npm run build
npm run lint
npm run db:status
```

## Database Migrations

Apply existing migrations:

```bash
npm run db:deploy
```

The root Docker Compose configuration provides a dedicated migration service that runs `prisma migrate deploy` before API startup.

Migration files are located in `prisma/migrations/`.

## Health Check

```http
GET /health
```

The health endpoint reports API and database status.

## Configuration

| Variable       | Description               |
| -------------- | ------------------------- |
| `DATABASE_URL` | PostgreSQL connection URL |
| `ADMIN_TOKEN`  | Administrative API secret |
| `NODE_ENV`     | Runtime environment       |
| `PORT`         | API listening port        |

Never commit `.env` or include secrets in logs or documentation.

For Docker setup, API routes, architecture, and deployment instructions, see the repository root `README.md`.
