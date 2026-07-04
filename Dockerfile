FROM node:23-slim AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace configuration and package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/shared/package.json ./backend/shared/
COPY backend/services/*/package.json ./backend/services/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY backend/ ./backend/

FROM node:23-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# We need the service name passed at build time
ARG SERVICE_NAME
ENV SERVICE_NAME=$SERVICE_NAME
ENV NODE_ENV=production

# Copy node_modules and source from builder
COPY --from=builder /app /app

# Expose the standard port (adjust if your services use different ports or rely on env variables)
EXPOSE 4000 4001 4002 4003 4004 4005 4006

# Command to run the specific microservice using tsx
CMD pnpm --filter @omniq/${SERVICE_NAME} run dev
