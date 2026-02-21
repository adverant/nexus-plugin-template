# ============================================================================
# {{PLUGIN_DISPLAY_NAME}} - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files and install all dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY nexus.manifest.json ./
COPY database/ ./database/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup -g 1001 nexus && \
    adduser -D -u 1001 -G nexus nexus

# Install tini for proper signal handling
RUN apk add --no-cache tini curl

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nexus:nexus /app/dist ./dist
COPY --from=builder --chown=nexus:nexus /app/node_modules ./node_modules
COPY --from=builder --chown=nexus:nexus /app/package.json ./
COPY --from=builder --chown=nexus:nexus /app/nexus.manifest.json ./
COPY --from=builder --chown=nexus:nexus /app/database ./database

# If the plugin has a standalone UI, copy the public directory
# Uncomment the following line if your UI build outputs to ./public/
# COPY --from=ui-builder --chown=nexus:nexus /app/ui/out ./public

# Create directories for data
RUN mkdir -p /tmp/plugin-data /data && chown -R nexus:nexus /tmp/plugin-data /data

# Labels
LABEL org.opencontainers.image.title="{{PLUGIN_DISPLAY_NAME}}"
LABEL org.opencontainers.image.source="https://github.com/adverant/{{REPO_NAME}}"
LABEL org.opencontainers.image.vendor="Adverant"
LABEL adverant.nexus.plugin="true"

# Switch to non-root user
USER nexus

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8080
ENV PLUGIN_NAME={{PLUGIN_NAME}}

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["tini", "--"]

CMD ["node", "dist/index.js"]
