# Nexus Plugin Template

A production-ready template for creating Adverant Nexus marketplace plugins. Includes Express.js backend, Next.js standalone UI, PostgreSQL database support, WebSocket real-time updates, Docker containerization, Kubernetes deployment, and automatic Nexus platform self-registration.

## Quick Start

```bash
# 1. Clone the template
git clone https://github.com/adverant/nexus-plugin-template.git my-plugin
cd my-plugin

# 2. Install dependencies
npm install

# 3. Start development server
npm run build && npm start
# Server runs at http://localhost:8080
# Health: http://localhost:8080/health
# API: http://localhost:8080/api/v1/info
```

The plugin works immediately without a database - API endpoints return mock responses. Add `DATABASE_URL` to `.env` for persistence.

## Project Structure

```
nexus-plugin-template/
├── src/
│   ├── index.ts                    # Express server, WebSocket, startup
│   ├── routes/
│   │   ├── health.ts               # /health, /ready, /live endpoints
│   │   └── api.ts                  # REST API routes (CRUD example)
│   ├── middleware/
│   │   ├── auth.ts                 # Tenant context extraction from proxy headers
│   │   └── error-handler.ts        # Centralized error handling
│   ├── database/
│   │   └── pool.ts                 # PostgreSQL pool + migration runner
│   └── services/
│       └── nexus-registration.ts   # Self-registration with Nexus marketplace
├── ui/                             # Next.js standalone UI
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Inter + JetBrains Mono fonts)
│   │   ├── page.tsx                # Main page (3-pane resizable layout)
│   │   └── globals.css             # Tailwind + custom styles
│   ├── components/
│   │   ├── Header.tsx              # Plugin header with connection status
│   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   ├── MainContent.tsx         # Tab content (Overview, Items, Analytics, Terminal, Settings)
│   │   └── StatusPanel.tsx         # Real-time activity panel
│   ├── hooks/
│   │   └── usePluginStore.ts       # Zustand store + WebSocket hook
│   ├── lib/
│   │   └── utils.ts                # Utility functions (cn for classnames)
│   ├── next.config.js              # Standalone output mode
│   └── package.json                # UI dependencies
├── database/
│   └── migrations/
│       └── 001_initial.sql         # Example schema with tenant isolation
├── k8s/
│   ├── deployment.yaml             # K8s Deployment with probes + env vars
│   ├── service.yaml                # ClusterIP Service
│   ├── configmap.yaml              # Non-sensitive config
│   └── secret.yaml                 # Sensitive config (API keys, DB URL)
├── tests/
│   └── index.test.ts               # Health, API, middleware, error tests
├── Dockerfile                      # Multi-stage production build
├── .dockerignore                   # Docker build exclusions
├── nexus.manifest.json             # Plugin Intelligence Document (PID)
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── jest.config.js                  # Test configuration
├── .eslintrc.js                    # Linting rules
├── .env.example                    # Environment variable template
└── .github/workflows/ci.yml        # CI pipeline (test + Docker build + security)
```

## Architecture

### Backend (Express.js)

The plugin runs as an Express.js HTTP server with:

- **Health endpoints**: `/health`, `/ready`, `/live` - required by K8s probes
- **REST API**: `/api/v1/*` - your plugin's business logic
- **WebSocket**: `/ws` - real-time updates to connected clients
- **Static files**: Serves the UI build from `./public/`
- **Tenant isolation**: User/tenant IDs extracted from Nexus proxy headers
- **Self-registration**: On startup, registers with Nexus marketplace

### Frontend (Next.js)

The standalone UI follows the EE Design Partner pattern:

- **3-pane resizable layout**: Sidebar | Main Content | Activity Panel
- **WebSocket integration**: Real-time event streaming
- **Dark mode**: Matches Nexus dashboard theme
- **Standalone output**: Builds to static files for Docker deployment

### Database (PostgreSQL)

- **Optional**: Plugin works without a database
- **Automatic migrations**: SQL files in `database/migrations/` run on startup
- **Tenant isolation**: All tables include `organization_id` for multi-tenant support

## Development

### Available Scripts

```bash
npm run build          # Compile TypeScript
npm run dev            # Watch mode (compile + restart on change)
npm start              # Start production server
npm test               # Run tests
npm run test:coverage  # Run tests with coverage report
npm run typecheck      # Type-check without emitting
npm run lint           # Lint source code
npm run docker:build   # Build Docker image
npm run docker:run     # Run Docker container
```

### Adding API Endpoints

Add routes in `src/routes/api.ts`:

```typescript
apiRouter.get('/my-endpoint', async (req: TenantRequest, res: Response) => {
  // req.userId - authenticated user ID
  // req.tenantId - tenant/organization ID
  // req.requestId - unique request trace ID

  res.json({ result: 'your data' });
});
```

### Using WebSocket

Broadcast events from API routes:

```typescript
import { broadcastToUser, broadcastToAll } from '../index';

// Send to specific user
broadcastToUser(userId, { type: 'task:completed', taskId: '123' });

// Send to all connected clients
broadcastToAll({ type: 'system:update', message: 'New version available' });
```

### Database Migrations

Add SQL files to `database/migrations/`:

```sql
-- database/migrations/002_add_tasks.sql
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
```

Migrations run automatically on startup in alphabetical order.

### Integrating Nexus Services

Access Nexus platform services via environment variables:

```typescript
// GraphRAG - Knowledge graph memory
const graphragUrl = process.env.NEXUS_GRAPHRAG_URL;

// MageAgent - Multi-agent orchestration
const mageagentUrl = process.env.NEXUS_MAGEAGENT_URL;

// Sandbox - Code execution
const sandboxUrl = process.env.NEXUS_SANDBOX_URL;

// FileProcess - File handling
const fileprocessUrl = process.env.NEXUS_FILEPROCESS_URL;

// Skills Engine - Skill registration
const skillsUrl = process.env.NEXUS_SKILLS_ENGINE_URL;
```

## Docker Build

```bash
# Build the image
docker build -t my-plugin:latest .

# Run locally
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e PLUGIN_NAME=my-plugin \
  my-plugin:latest
```

## Kubernetes Deployment

1. Update template variables in `k8s/*.yaml` (replace `{{PLUGIN_NAME}}`)
2. Create secrets: `kubectl apply -f k8s/secret.yaml`
3. Apply config: `kubectl apply -f k8s/configmap.yaml`
4. Deploy: `kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml`

## Marketplace Registration

### Automatic (Self-Registration)

Set these environment variables and the plugin registers itself on startup:

```
NEXUS_API_URL=https://api.adverant.ai
NEXUS_API_KEY=your-api-key
```

### Manual

1. Push to GitHub
2. Submit via Nexus Dashboard: https://dashboard.adverant.ai/plugins/submit
3. Or via API: `POST /api/v1/developers/plugins/submit`

## Plugin Manifest (nexus.manifest.json)

The manifest declares your plugin's capabilities to the Nexus platform:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Plugin slug (lowercase, alphanumeric + hyphens) |
| `display_name` | Yes | Human-readable name |
| `version` | Yes | Semver version |
| `nexus.executionMode` | Yes | `mcp_container` (recommended), `external_https`, `hardened_docker`, `firecracker` |
| `nexus.entrypoint` | Yes | HTTP port and health check paths |
| `ui.enabled` | No | Whether plugin has a web UI |
| `ui.path` | No | Root path for the UI (default: `/`) |
| `has_web_ui` | Yes | `true` if plugin serves a web interface |
| `api.endpoints` | No | Declared API endpoints |
| `websocket.enabled` | No | Whether WebSocket is available |
| `resources` | No | CPU/memory/disk requirements |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Tests cover:
- Health endpoints (`/health`, `/ready`, `/live`)
- API CRUD operations
- Tenant context middleware
- Error handling

## Troubleshooting

### Plugin doesn't appear in marketplace
- Verify `NEXUS_API_URL` and `NEXUS_API_KEY` are set
- Check startup logs for registration errors
- Ensure `nexus.manifest.json` is valid JSON

### "Open UI" button doesn't appear
- Verify `has_web_ui: true` in manifest
- Verify `ui_path: "/"` is set
- Ensure the plugin serves HTML on its root path

### Database connection fails
- Verify `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`
- Ensure PostgreSQL is accessible from the plugin container
- Check K8s service DNS for in-cluster databases

### WebSocket disconnects
- Check K8s ingress supports WebSocket upgrades
- Verify Istio/proxy timeout settings (default 300s)
- Check client reconnection logic in `usePluginStore.ts`

## License

MIT License - see LICENSE file for details.
