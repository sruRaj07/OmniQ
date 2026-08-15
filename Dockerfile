FROM node:23-slim AS builder

WORKDIR /app

# Pin pnpm to the version in the root package.json's `packageManager` field. `corepack prepare
# pnpm@latest` installed a DIFFERENT version at build time, so at container start corepack found a
# mismatch and re-downloaded pnpm 10.33.2 from npmjs.org - on every cold start, on every service.
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all source code (preserves exact directory structure)
COPY backend/ ./backend/

# Install dependencies
RUN pnpm config set ignore-scripts true && pnpm install --frozen-lockfile

# Compile the service to plain JavaScript. Production previously ran `pnpm dev` -> `tsx src/server.ts`,
# transpiling TypeScript on every boot; combined with the corepack download above that dominated the
# measured 26-31s cold start. `tsc --outDir dist` emits to dist/services/<name>/src/server.js and
# dist/shared/**, because tsconfig `include` spans both the service and backend/shared.
ARG SERVICE_NAME
RUN pnpm --filter @omniq/${SERVICE_NAME} run build

FROM node:23-slim

WORKDIR /app

# No corepack or pnpm in the runtime image: the entrypoint is node itself, so there is nothing left
# to download or resolve at start-up.
ARG SERVICE_NAME
ENV SERVICE_NAME=$SERVICE_NAME
ENV NODE_ENV=production

# Copy installed dependencies and compiled output from builder
COPY --from=builder /app /app

# Expose the standard port (adjust if your services use different ports or rely on env variables)
EXPOSE 4000 4001 4002 4003 4004 4005 4006

# Run the compiled entrypoint directly.
CMD node backend/services/${SERVICE_NAME}/dist/services/${SERVICE_NAME}/src/server.js
