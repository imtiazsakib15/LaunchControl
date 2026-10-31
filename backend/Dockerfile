# --------------------------------------------------
# Base image
# --------------------------------------------------
FROM node:24-bookworm-slim AS base

# Prisma requires OpenSSL
RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./


# --------------------------------------------------
# Install all dependencies
# --------------------------------------------------
FROM base AS build-deps

RUN npm ci


# --------------------------------------------------
# Generate Prisma Client and build NestJS
# --------------------------------------------------
FROM build-deps AS build

COPY . .

# Prisma 7 loads DATABASE_URL from prisma.config.ts.
# This placeholder is only for build-time Prisma generation.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"

# Generate Prisma Client
RUN npx prisma generate --config prisma.config.ts

# Build NestJS application
RUN npm run build


# --------------------------------------------------
# Install production dependencies only
# --------------------------------------------------
FROM base AS production-deps

ENV NODE_ENV=production

RUN npm ci --omit=dev


# --------------------------------------------------
# Production runtime
# --------------------------------------------------
FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3000

# Production dependencies
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules

# Application package metadata
COPY --from=build --chown=node:node /app/package.json ./package.json

# Compiled application
COPY --from=build --chown=node:node /app/dist ./dist

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
