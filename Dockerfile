# Multi-stage production Dockerfile for Nexus Plugin
# Optimized for layer caching and minimal image size

# Base stage
FROM --platform=linux/amd64 node:20-alpine AS base
RUN apk update && apk add --no-cache tini curl && rm -rf /var/cache/apk/*
WORKDIR /app

# Dependencies stage
FROM --platform=linux/amd64 base AS deps
RUN apk update && apk add --no-cache python3 make g++ git
COPY backend/package*.json ./
RUN npm install && npm cache clean --force && cp -R node_modules prod_node_modules

# Build stage
FROM --platform=linux/amd64 deps AS builder
COPY backend/tsconfig*.json ./
COPY backend/src/ ./src/
COPY backend/database/migrations/ ./migrations/

# Frontend build stage (Next.js static export)
FROM --platform=linux/amd64 node:20-alpine AS frontend-builder
RUN apk add --no-cache libc6-compat
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build && \
    test -f /app/frontend/out/index.html || (echo "FATAL: frontend build did not produce out/index.html" && exit 1)

# Development stage
FROM --platform=linux/amd64 base AS development
RUN apk update && apk add --no-cache python3 make g++ git postgresql-client bash
RUN npm install -g ts-node ts-node-dev nodemon
COPY backend/package*.json backend/tsconfig*.json ./
RUN npm install
COPY backend/src/ ./src/
COPY backend/database/migrations/ ./migrations/
# CUSTOMIZE: Adjust ports
EXPOSE 9099 9100 9229
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Production stage
FROM --platform=linux/amd64 base AS production
RUN apk update && apk add --no-cache postgresql-client git \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001
WORKDIR /app

COPY --from=deps --chown=nodejs:nodejs /app/prod_node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig*.json ./
COPY --chown=nodejs:nodejs backend/package*.json ./
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/out ./frontend/out

USER root
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app
USER nodejs

# CUSTOMIZE: Adjust ports
EXPOSE 9099 9100

# CUSTOMIZE: Set health check path
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9099/{{PLUGIN_SLUG}}/health || exit 1

ENV NODE_ENV=production \
    PORT=9099 \
    WS_PORT=9100 \
    LOG_LEVEL=info \
    TS_NODE_TRANSPILE_ONLY=true

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--require", "ts-node/register", "src/index.ts"]
