# Nexus Plugin Go Template - Dockerfile
# Multi-stage build for minimal production image

# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/bin/nexus-plugin \
    ./cmd/plugin

# Production stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Create non-root user
RUN adduser -D -g '' nexus
USER nexus

# Copy binary from builder
COPY --from=builder /app/bin/nexus-plugin /app/nexus-plugin
COPY --from=builder /app/nexus.manifest.json /app/nexus.manifest.json

# Expose MCP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/nexus-plugin"]
