#!/bin/bash

# Plugin Migration Script
# Usage: ./migrate-plugin.sh <service-name> <display-name> <category> <description>

set -e

SERVICE_NAME="$1"
DISPLAY_NAME="$2"
CATEGORY="$3"
DESCRIPTION="$4"

# Extract repo name from service name (remove nexus- prefix and format)
REPO_SUFFIX=$(echo "$SERVICE_NAME" | sed 's/nexus-//' | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)$i=toupper(substr($i,1,1)) substr($i,2)}1' | sed 's/ //g')
REPO_NAME="Adverant-Nexus-Plugin-${REPO_SUFFIX}"

if [ -z "$SERVICE_NAME" ] || [ -z "$DISPLAY_NAME" ] || [ -z "$CATEGORY" ]; then
    echo "Usage: ./migrate-plugin.sh <service-name> <display-name> <category> [description]"
    echo "Example: ./migrate-plugin.sh nexus-crm 'Nexus CRM' 'business' 'AI-powered CRM'"
    exit 1
fi

SERVICE_DIR="/Users/don/Adverant/Adverant-Nexus/services/${SERVICE_NAME}"
TEMPLATE_DIR="/Users/don/Adverant/plugin-template"
TARGET_DIR="/Users/don/Adverant/plugins/${REPO_NAME}"

echo "=========================================="
echo "Migrating: $DISPLAY_NAME"
echo "Service: $SERVICE_NAME"
echo "Repository: $REPO_NAME"
echo "Category: $CATEGORY"
echo "=========================================="

# Check if service exists
if [ ! -d "$SERVICE_DIR" ]; then
    echo "ERROR: Service directory not found: $SERVICE_DIR"
    exit 1
fi

# Clone the repo if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    echo "Cloning repository..."
    mkdir -p /Users/don/Adverant/plugins
    cd /Users/don/Adverant/plugins
    gh repo clone "adverant/${REPO_NAME}" 2>/dev/null || {
        echo "Repository not found or clone failed"
        exit 1
    }
fi

cd "$TARGET_DIR"

# Create directory structure
echo "Creating directory structure..."
mkdir -p .github/{ISSUE_TEMPLATE,workflows}
mkdir -p docs/{getting-started,api-reference,architecture/diagrams,use-cases/{enterprise,startup,examples},changelog}
mkdir -p assets/{screenshots,diagrams}
mkdir -p k8s
mkdir -p src/{types,services,routes,middleware,utils}
mkdir -p database/migrations 2>/dev/null || true

# Copy source code if exists
echo "Copying source code..."
if [ -d "$SERVICE_DIR/src" ]; then
    cp -r "$SERVICE_DIR/src/"* src/ 2>/dev/null || true
fi

if [ -d "$SERVICE_DIR/database" ]; then
    cp -r "$SERVICE_DIR/database/"* database/ 2>/dev/null || true
fi

if [ -d "$SERVICE_DIR/k8s" ]; then
    cp -r "$SERVICE_DIR/k8s/"* k8s/ 2>/dev/null || true
fi

# Copy config files
[ -f "$SERVICE_DIR/package.json" ] && cp "$SERVICE_DIR/package.json" .
[ -f "$SERVICE_DIR/tsconfig.json" ] && cp "$SERVICE_DIR/tsconfig.json" .
[ -f "$SERVICE_DIR/Dockerfile" ] && cp "$SERVICE_DIR/Dockerfile" .
[ -f "$SERVICE_DIR/nexus.manifest.json" ] && cp "$SERVICE_DIR/nexus.manifest.json" .

# Copy template files
echo "Copying template files..."
cp "$TEMPLATE_DIR/LICENSE" .
cp "$TEMPLATE_DIR/CODE_OF_CONDUCT.md" .
cp "$TEMPLATE_DIR/SECURITY.md" .
cp -r "$TEMPLATE_DIR/.github/"* .github/
cp -r "$TEMPLATE_DIR/docs/getting-started/"* docs/getting-started/ 2>/dev/null || true
cp -r "$TEMPLATE_DIR/docs/api-reference/"* docs/api-reference/ 2>/dev/null || true

# Create .env.example
PLUGIN_NAME_UPPER=$(echo "$SERVICE_NAME" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
cat > .env.example << EOF
# ${DISPLAY_NAME} Configuration

# Required
NEXUS_API_URL=https://api.adverant.ai
PORT=9200

# Database
DATABASE_URL=postgresql://nexus:nexus@localhost:5432/nexus

# Optional
LOG_LEVEL=info
${PLUGIN_NAME_UPPER}_TIMEOUT_MS=30000
${PLUGIN_NAME_UPPER}_MAX_CONCURRENT=5
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Build
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test
coverage/
.nyc_output/

# Temp
tmp/
temp/
EOF

# Replace placeholders in template files
echo "Customizing files..."
find . -type f \( -name "*.md" -o -name "*.yml" \) ! -path "./.git/*" -exec sed -i '' \
  -e "s/{{PLUGIN_NAME}}/${SERVICE_NAME}/g" \
  -e "s/{{PLUGIN_DISPLAY_NAME}}/${DISPLAY_NAME}/g" \
  -e "s/{{PLUGIN_NAME_UPPER}}/${PLUGIN_NAME_UPPER}/g" \
  -e "s/{{REPO_NAME}}/${REPO_NAME}/g" \
  -e "s/{{PLUGIN_CATEGORY}}/${CATEGORY}/g" \
  {} \; 2>/dev/null || true

# Update package.json repository URL if exists
if [ -f "package.json" ]; then
    sed -i '' "s|\"url\": \".*github.com/adverant/.*\"|\"url\": \"https://github.com/adverant/${REPO_NAME}\"|g" package.json 2>/dev/null || true
fi

echo "=========================================="
echo "Migration complete for: $DISPLAY_NAME"
echo "Target: $TARGET_DIR"
echo ""
echo "Next steps:"
echo "1. Create/update README.md"
echo "2. Create nexus.manifest.json if missing"
echo "3. Add & commit files"
echo "4. Push to GitHub"
echo "=========================================="
