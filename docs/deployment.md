# Nexus Plugin Deployment Guide

This guide covers deploying Nexus plugins to customer VPS stacks.

## Deployment Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Pipeline                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Verification                                             │
│     - Manifest validation                                    │
│     - Code analysis                                          │
│     - Security scanning                                      │
│     - Sandbox testing                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Approval                                                 │
│     - Auto-approval (community tier)                         │
│     - Manual review (enterprise tier)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Registry Publishing                                      │
│     - Plugin Intelligence Document                           │
│     - Container image to registry                            │
│     - Version tracking                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. VPS Deployment                                           │
│     - Namespace creation                                     │
│     - Secret injection                                       │
│     - Container deployment                                   │
│     - Health monitoring                                      │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### For Developers

- GitHub account connected to Nexus Developer Portal
- Plugin passes local validation
- Tests pass with >80% coverage
- Docker image builds successfully

### For Customers

- Nexus VPS stack deployed
- Plugin entitlements configured
- API keys provisioned (if required)

## Submission Process

### Step 1: Prepare Your Plugin

```bash
# Validate manifest
npx nexus-plugin validate

# Run tests
npm test

# Build Docker image
docker build -t my-plugin:latest .

# Test container locally
docker run --rm my-plugin:latest
```

### Step 2: Push to GitHub

```bash
git add .
git commit -m "feat: initial plugin release"
git push origin main
```

### Step 3: Submit via Developer Portal

1. Go to [Nexus Developer Portal](https://developer.nexus.adverant.ai)
2. Click "Submit Plugin"
3. Select your GitHub repository
4. Choose the branch (usually `main`)
5. Click "Start Verification"

### Step 4: Monitor Verification

The verification pipeline runs automatically:

1. **Clone Repository** (~30s)
2. **Manifest Validation** (~10s)
3. **Code Analysis** (~2min)
4. **Schema Extraction** (~30s)
5. **Security Scanning** (~3min)
6. **Sandbox Testing** (~2min)
7. **PID Generation** (~30s)

Total time: ~8-10 minutes

### Step 5: Approval

| Trust Level | Approval Process |
|-------------|------------------|
| Community | Automatic (if all checks pass) |
| Enterprise | Manual review within 24 hours |
| Verified Publisher | Automatic + priority queue |

## Execution Modes

### MCP Container (Default)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: plugin-my-plugin
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: mcp
          image: registry.nexus.local/plugins/my-plugin:1.0.0
          stdin: true
          resources:
            limits:
              cpu: "500m"
              memory: "512Mi"
          securityContext:
            runAsNonRoot: true
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
```

### Hardened Docker

```yaml
spec:
  containers:
    - name: plugin
      securityContext:
        seccompProfile:
          type: Localhost
          localhostProfile: profiles/plugin-restricted.json
        appArmorProfile: plugin-hardened
```

### Firecracker (Coming Soon)

For maximum isolation, plugins can run in Firecracker microVMs.

## Blue-Green Deployments

Nexus supports zero-downtime updates:

```
┌─────────────────────────────────────────────────────────────┐
│                     Blue-Green Deploy                        │
└─────────────────────────────────────────────────────────────┘

   ┌──────────┐          ┌──────────┐
   │  Blue    │  100%    │  Green   │   0%
   │  v1.0.0  │◄─────────│  v1.1.0  │
   └──────────┘          └──────────┘
           │
           │  Health check passes
           ▼
   ┌──────────┐          ┌──────────┐
   │  Blue    │   50%    │  Green   │  50%
   │  v1.0.0  │◄─────────│  v1.1.0  │
   └──────────┘          └──────────┘
           │
           │  Gradual shift
           ▼
   ┌──────────┐          ┌──────────┐
   │  Blue    │    0%    │  Green   │ 100%
   │  v1.0.0  │          │  v1.1.0  │◄─────
   └──────────┘          └──────────┘
```

## Health Checks

### Required Endpoints

```typescript
// Liveness probe - is the process alive?
app.get('/health/live', (req, res) => {
  res.json({ status: 'ok' });
});

// Readiness probe - is the process ready for traffic?
app.get('/health/ready', async (req, res) => {
  try {
    // Check dependencies
    await graphrag.ping();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

### Kubernetes Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

## Secrets Management

### Declaring Required Secrets

```json
{
  "nexus": {
    "environmentVariables": [
      {
        "name": "EXTERNAL_API_KEY",
        "required": true,
        "description": "API key for external service",
        "secret": true
      }
    ]
  }
}
```

### Customer Configuration

Customers configure secrets via the Nexus Dashboard:

1. Go to Plugins → My Plugin → Settings
2. Enter the API key
3. Click Save

Secrets are stored encrypted and injected at runtime.

## Monitoring & Observability

### Metrics

Plugins automatically export metrics:

| Metric | Description |
|--------|-------------|
| `plugin_requests_total` | Total requests handled |
| `plugin_request_duration_seconds` | Request latency histogram |
| `plugin_errors_total` | Total errors by type |
| `plugin_active_connections` | Current active connections |

### Logging

Structured logs are collected automatically:

```typescript
context.logger.info('Processing request', {
  toolName: 'search_knowledge',
  query: input.query,
  resultCount: results.length,
});
```

### Tracing

Distributed tracing with OpenTelemetry:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-plugin');

handler: async (input, context) => {
  return tracer.startActiveSpan('search', async (span) => {
    span.setAttribute('query', input.query);
    
    const results = await search(input.query);
    
    span.setAttribute('resultCount', results.length);
    span.end();
    
    return { results };
  });
}
```

## Rollback

### Automatic Rollback

Rollback triggers automatically if:

- Health check fails 3 times
- Error rate exceeds 10% for 5 minutes
- Latency P99 exceeds 10x baseline

### Manual Rollback

Via Developer Portal:

1. Go to Plugins → My Plugin → Versions
2. Select the previous version
3. Click "Rollback"

Via CLI:

```bash
nexus plugin rollback my-plugin --to-version 1.0.0
```

## Resource Limits

### Default Limits

| Resource | MCP Container | Hardened | Firecracker |
|----------|---------------|----------|-------------|
| CPU | 500m | 1000m | 2000m |
| Memory | 512Mi | 1Gi | 2Gi |
| Storage | None | 1Gi | 5Gi |
| Timeout | 30s | 60s | 120s |

### Custom Limits

```json
{
  "resources": {
    "cpuMillicores": 1000,
    "memoryMB": 1024,
    "timeoutMs": 60000
  }
}
```

## Debugging

### View Logs

```bash
# Via CLI
nexus plugin logs my-plugin --follow

# Via kubectl (admin only)
kubectl logs -n plugins-customer-123 deployment/my-plugin -f
```

### Connect to Container

```bash
# Development mode only
nexus plugin exec my-plugin -- /bin/sh
```

### Debug Mode

Enable verbose logging:

```json
{
  "nexus": {
    "environmentVariables": [
      {
        "name": "DEBUG",
        "value": "true"
      }
    ]
  }
}
```

## Versioning

### Semantic Versioning

Plugins must follow semver:

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Version Constraints

```json
{
  "nexus": {
    "minVersion": "2.0.0"
  }
}
```

Customers can pin versions:

```
plugins:
  my-plugin: "^1.0.0"  # Accept minor updates
  other-plugin: "1.2.3"  # Exact version
```

## Cost & Billing

### Pricing Model

| Tier | Rate | Revenue Split |
|------|------|---------------|
| Free | $0 | N/A |
| Standard | $0.001/call | 80/20 |
| Premium | Custom | 80/20 |

### Usage Tracking

Usage is tracked automatically:

```json
{
  "plugin": "my-plugin",
  "period": "2024-01",
  "calls": 15420,
  "revenue": {
    "gross": 15.42,
    "developerShare": 12.34,
    "platformShare": 3.08
  }
}
```

## Support

### Developer Resources

- [Documentation](https://docs.nexus.adverant.ai/plugins)
- [GitHub Issues](https://github.com/adverant/nexus-plugin-template/issues)
- [Discord Community](https://discord.gg/adverant)

### Enterprise Support

For enterprise customers:

- Priority review queue
- Dedicated support channel
- Custom deployment options
- SLA guarantees
