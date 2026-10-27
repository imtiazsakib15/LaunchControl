
# Base image
FROM node:24-bookworm-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./

# Install all dependencies required for generating Prisma Client and building NestJS.
FROM base AS build-deps

RUN npm ci

# Generate Prisma Client and compile the application.
FROM build-deps AS build

COPY . .

# Prisma 7 loads DATABASE_URL from prisma.config.ts during generation.
# This is a build-only placeholder; no database connection is made here.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"

RUN npx prisma generate
RUN npm run build

# Install only production dependencies.
FROM base AS production-deps

ENV NODE_ENV=production

RUN npm ci --omit=dev

# Minimal runtime image.
FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
