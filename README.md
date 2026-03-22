# Nexus Plugin Template

Official template for building Nexus marketplace plugins. Extracted from the ProseCreator plugin -- the most feature-complete Nexus plugin implementation.

## Quick Start

```bash
# Create a new plugin
./setup-plugin.sh nexus-crm "Nexus CRM" "AI-Powered CRM" "business"

# Or specify a custom output directory
./setup-plugin.sh nexus-crm "Nexus CRM" "AI-Powered CRM" "business" /path/to/output

# Start developing
cd /path/to/output
cd backend && npm install && npm run dev   # API server on :9099
cd frontend && npm install && npm run dev  # Next.js on :3002
```

## Template Variables

The `setup-plugin.sh` script replaces these placeholders in all files:

| Placeholder | Example | Description |
|---|---|---|
| `{{PLUGIN_NAME}}` | `nexus-crm` | Plugin package name / slug |
| `{{PLUGIN_SLUG}}` | `nexus-crm` | URL path segment |
| `{{PLUGIN_DISPLAY_NAME}}` | `Nexus CRM` | Human-readable name |
| `{{PLUGIN_TAGLINE}}` | `AI-Powered CRM` | Short description |
| `{{PLUGIN_DESCRIPTION}}` | `Nexus CRM - AI-Powered CRM` | Full description |
| `{{PLUGIN_NAME_UPPER}}` | `NEXUS_CRM` | ENV var prefix |
| `{{REPO_NAME}}` | `Adverant-Nexus-Plugin-Crm` | GitHub repository name |
| `{{PLUGIN_CATEGORY}}` | `business` | Marketplace category |

## Architecture

```
plugin/
├── frontend/                    # Next.js 14 (App Router, static export)
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── ThemeInitializer    # Hydrates theme from localStorage
│   │   ├── AppBridgeProvider   # Dashboard iframe communication
│   │   ├── BrandingProvider    # White-label branding
│   │   ├── EmbeddedLayoutWrapper
│   │   └── dashboard/
│   │       └── <plugin-slug>/
│   │           ├── layout.tsx  # Plugin layout with auth gate + sidebar
│   │           └── page.tsx    # Overview page
│   ├── components/
│   │   ├── gates/
│   │   │   └── PluginGate.tsx  # Auth wall (JWT required)
│   │   └── PageContextBridge   # Cross-origin context sync
│   ├── hooks/
│   │   ├── useEmbedded.ts      # Detect iframe mode
│   │   ├── usePageContext.ts   # Generate Terminal Computer context
│   │   └── useThemeClasses.ts  # Theme-aware CSS classes
│   ├── lib/
│   │   ├── nexus-app-bridge.ts # Plugin <-> Dashboard SDK
│   │   ├── api-config.ts       # Custom domain detection
│   │   ├── auth-fetch.ts       # JWT-aware fetch with retry
│   │   └── i18n-stub.ts        # Lightweight translations
│   └── stores/
│       ├── dashboard-store.ts  # Auth token management
│       ├── theme-store.ts      # Dark/light theme
│       ├── branding-store.ts   # White-label config
│       └── floating-terminal-store.ts  # Terminal context bridge
├── backend/                     # Express + TypeScript
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── config/             # Environment config
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT auth + tier enforcement
│   │   │   └── errorHandler.ts # Error handling
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   ├── db/                 # Database repositories
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Logger, helpers
│   └── database/
│       └── migrations/         # SQL migrations
├── k8s/
│   └── deployment.yaml         # K8s Deployment + Service
├── Dockerfile                  # Multi-stage build
├── nexus.manifest.json         # Plugin manifest
├── setup-plugin.sh             # Plugin scaffolding script
└── migrate-plugin.sh           # Migrate existing service to plugin
```

## Key Patterns

### 1. NexusAppBridge (Plugin SDK)
Communication between plugin iframe and dashboard parent window.
- Auth token passing (URL param -> bridge -> store)
- Theme sync (dark/light mode)
- Bi-directional navigation
- Auto iframe resize
- Toast notifications

### 2. Triple-Strategy Context Bridge
Delivers page context to Terminal Computer (Claude Code):
- **postMessage**: Fastest, for embedded iframe mode
- **API POST**: Cross-origin, for standalone mode
- **localStorage + BroadcastChannel**: Same-origin fallback

### 3. White-Label Auth Flow
Full OAuth/JWT handling for standalone plugin domains:
- Token from URL param -> stripped for security -> stored in Zustand
- Refresh token rotation
- Session expiry detection with re-auth

### 4. Plugin Layout Pattern
Dynamic imports with `ssr: false` to prevent React #185 hydration errors:
```tsx
const Sidebar = dynamic(() => import('./Sidebar'), { ssr: false });
```

### 5. Auth Gate
Blocks all rendering without valid JWT. Supports:
- Standard mode: "Go to Dashboard" redirect
- White-label mode: Custom login form
- Session expired: Refresh prompt

### 6. Theme Integration
Matches Nexus Dashboard's Coinest dark theme exactly:
- `useThemeClasses()` hook for consistent styling
- `useTheme()` for state access
- CSS custom properties for brand colors

## Deployment

1. Build Docker image on the server (NOT locally -- ARM64 vs AMD64):
   ```bash
   docker build -t localhost:5000/nexus-crm:latest .
   docker push localhost:5000/nexus-crm:latest
   ```

2. Apply K8s manifests:
   ```bash
   kubectl apply -f k8s/deployment.yaml
   ```

3. Add Istio VirtualService route for your plugin.

## License

Apache-2.0
