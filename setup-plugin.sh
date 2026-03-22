#!/bin/bash

# Nexus Plugin Setup Script
# Creates a new plugin from the template with full frontend, backend, Docker, K8s, and manifest.
#
# Usage: ./setup-plugin.sh <plugin-name> <display-name> <tagline> [category] [target-dir]
# Example: ./setup-plugin.sh nexus-crm "Nexus CRM" "AI-Powered CRM" "business"
# Example: ./setup-plugin.sh nexus-reposwarm "RepoSwarm" "Repository Intelligence" "developer-tools" /path/to/output

set -e

PLUGIN_NAME="$1"
PLUGIN_DISPLAY_NAME="$2"
PLUGIN_TAGLINE="${3:-Nexus Plugin}"
PLUGIN_CATEGORY="${4:-development}"
CUSTOM_TARGET_DIR="$5"
PLUGIN_DESCRIPTION="${PLUGIN_DISPLAY_NAME} - ${PLUGIN_TAGLINE}"

# Derive slug (strip nexus- prefix if present)
PLUGIN_SLUG="$PLUGIN_NAME"
REPO_NAME="Adverant-Nexus-Plugin-${PLUGIN_NAME#nexus-}"

if [ -z "$PLUGIN_NAME" ] || [ -z "$PLUGIN_DISPLAY_NAME" ]; then
    echo "Usage: ./setup-plugin.sh <plugin-name> <display-name> [tagline] [category] [target-dir]"
    echo ""
    echo "Arguments:"
    echo "  plugin-name      Plugin slug (e.g., nexus-crm)"
    echo "  display-name     Human-readable name (e.g., 'Nexus CRM')"
    echo "  tagline          Short description (e.g., 'AI-Powered CRM')"
    echo "  category         Plugin category (default: development)"
    echo "                   Options: development, business, ai-ml, analytics, security, integration, content-creation"
    echo "  target-dir       Output directory (default: ../plugins/<repo-name>)"
    echo ""
    echo "Examples:"
    echo "  ./setup-plugin.sh nexus-reposwarm 'RepoSwarm' 'Repository Intelligence' 'developer-tools'"
    echo "  ./setup-plugin.sh nexus-crm 'Nexus CRM' 'AI-Powered CRM' 'business' /tmp/my-plugin"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -n "$CUSTOM_TARGET_DIR" ]; then
    TARGET_DIR="$CUSTOM_TARGET_DIR"
else
    TARGET_DIR="$(dirname "$SCRIPT_DIR")/plugins/${REPO_NAME}"
fi

PLUGIN_NAME_UPPER=$(echo "$PLUGIN_NAME" | tr '[:lower:]' '[:upper:]' | tr '-' '_')

echo "=========================================="
echo "Nexus Plugin Setup"
echo "=========================================="
echo "Plugin:     $PLUGIN_DISPLAY_NAME ($PLUGIN_NAME)"
echo "Tagline:    $PLUGIN_TAGLINE"
echo "Category:   $PLUGIN_CATEGORY"
echo "Repository: $REPO_NAME"
echo "Target:     $TARGET_DIR"
echo "=========================================="

mkdir -p "$TARGET_DIR"

# Detect sed behavior (BSD vs GNU)
SED_INPLACE=(-i '')
if sed --version 2>/dev/null | grep -q 'GNU'; then
    SED_INPLACE=(-i)
fi

# Copy all template files
echo ""
echo "[1/7] Copying frontend template..."
if [ -d "$SCRIPT_DIR/frontend" ]; then
    cp -r "$SCRIPT_DIR/frontend" "$TARGET_DIR/"
    # Rename plugin-name directory to actual slug
    if [ -d "$TARGET_DIR/frontend/app/dashboard/plugin-name" ]; then
        mv "$TARGET_DIR/frontend/app/dashboard/plugin-name" "$TARGET_DIR/frontend/app/dashboard/$PLUGIN_SLUG"
    fi
fi

echo "[2/7] Copying backend template..."
if [ -d "$SCRIPT_DIR/backend" ]; then
    cp -r "$SCRIPT_DIR/backend" "$TARGET_DIR/"
fi

echo "[3/7] Copying infrastructure files..."
if [ -d "$SCRIPT_DIR/k8s" ]; then
    cp -r "$SCRIPT_DIR/k8s" "$TARGET_DIR/"
fi
for f in Dockerfile nexus.manifest.json .gitignore; do
    if [ -f "$SCRIPT_DIR/$f" ]; then
        cp "$SCRIPT_DIR/$f" "$TARGET_DIR/"
    fi
done

echo "[4/7] Copying documentation and community files..."
if [ -d "$SCRIPT_DIR/docs" ]; then
    cp -r "$SCRIPT_DIR/docs" "$TARGET_DIR/"
fi
for doc_file in LICENSE CODE_OF_CONDUCT.md CONTRIBUTING.md SECURITY.md; do
    if [ -f "$SCRIPT_DIR/$doc_file" ]; then
        cp "$SCRIPT_DIR/$doc_file" "$TARGET_DIR/"
    fi
done

echo "[5/7] Copying CI/CD workflows..."
if [ -d "$SCRIPT_DIR/.github" ]; then
    mkdir -p "$TARGET_DIR/.github"
    cp -r "$SCRIPT_DIR/.github/"* "$TARGET_DIR/.github/"
fi

mkdir -p "$TARGET_DIR/assets/"{screenshots,diagrams}

# Replace ALL template placeholders
echo "[6/7] Customizing template variables..."
cd "$TARGET_DIR"

find . -type f \( \
    -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o \
    -name "*.yaml" -o -name "*.yml" -o -name "*.md" -o -name "*.css" -o \
    -name "*.sql" -o -name "*.sh" -o -name "*.env*" -o -name "Dockerfile" -o \
    -name ".dockerignore" \
\) ! -path "./.git/*" ! -path "./node_modules/*" ! -path "./.next/*" | while read -r file; do
    if [ -f "$file" ]; then
        sed "${SED_INPLACE[@]}" \
            -e "s/{{PLUGIN_NAME}}/${PLUGIN_NAME}/g" \
            -e "s/{{PLUGIN_DISPLAY_NAME}}/${PLUGIN_DISPLAY_NAME}/g" \
            -e "s/{{PLUGIN_SLUG}}/${PLUGIN_SLUG}/g" \
            -e "s/{{PLUGIN_NAME_UPPER}}/${PLUGIN_NAME_UPPER}/g" \
            -e "s/{{REPO_NAME}}/${REPO_NAME}/g" \
            -e "s/{{PLUGIN_CATEGORY}}/${PLUGIN_CATEGORY}/g" \
            -e "s/{{PLUGIN_TAGLINE}}/${PLUGIN_TAGLINE}/g" \
            -e "s/{{PLUGIN_DESCRIPTION}}/${PLUGIN_DESCRIPTION}/g" \
            "$file" 2>/dev/null || true
    fi
done

# Create .env from .env.example
if [ -f "backend/.env.example" ] && [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "  Created backend/.env from .env.example"
fi

# Initialize git repo
echo "[7/7] Initializing git repository..."
if [ ! -d ".git" ]; then
    git init -q
    git add -A
    git commit -q -m "Initial plugin scaffold from nexus-plugin-template"
    echo "  Git repository initialized with initial commit"
else
    echo "  Git repository already exists"
fi

echo ""
echo "=========================================="
echo "Plugin setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "  cd $TARGET_DIR"
echo ""
echo "  # Backend:"
echo "  cd backend && npm install && npm run dev"
echo ""
echo "  # Frontend:"
echo "  cd frontend && npm install && npm run dev"
echo ""
echo "  # Build Docker image (on server, NOT locally):"
echo "  docker build -t $PLUGIN_NAME ."
echo ""
echo "Backend API: http://localhost:9099/$PLUGIN_SLUG/api"
echo "Frontend UI: http://localhost:3002"
echo ""
