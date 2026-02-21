#!/bin/bash

# Nexus Plugin Setup Script
# Creates a new plugin from the template with all source code, UI, Docker, K8s, and manifest.
#
# Usage: ./setup-plugin.sh <plugin-name> <display-name> <category> [target-dir]
# Example: ./setup-plugin.sh nexus-reposwarm "RepoSwarm" "developer-tools"
# Example: ./setup-plugin.sh nexus-crm "Nexus CRM" "business" /path/to/output

set -e

PLUGIN_NAME="$1"
PLUGIN_DISPLAY_NAME="$2"
PLUGIN_CATEGORY="${3:-development}"
CUSTOM_TARGET_DIR="$4"
REPO_NAME="Adverant-Nexus-Plugin-${PLUGIN_NAME#nexus-}"

if [ -z "$PLUGIN_NAME" ] || [ -z "$PLUGIN_DISPLAY_NAME" ]; then
    echo "Usage: ./setup-plugin.sh <plugin-name> <display-name> [category] [target-dir]"
    echo ""
    echo "Arguments:"
    echo "  plugin-name      Plugin slug (e.g., nexus-reposwarm)"
    echo "  display-name     Human-readable name (e.g., 'RepoSwarm')"
    echo "  category         Plugin category (default: development)"
    echo "                   Options: development, business, ai-ml, analytics, security, integration"
    echo "  target-dir       Output directory (default: ./plugins/<repo-name>)"
    echo ""
    echo "Examples:"
    echo "  ./setup-plugin.sh nexus-reposwarm 'RepoSwarm' 'developer-tools'"
    echo "  ./setup-plugin.sh nexus-crm 'Nexus CRM' 'business' /tmp/my-plugin"
    exit 1
fi

# Resolve directories relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_SOURCE_DIR="$(dirname "$SCRIPT_DIR")/Adverant-Nexus/examples/plugin-template"

# Fallback: check if template source is in same directory
if [ ! -d "$TEMPLATE_SOURCE_DIR" ]; then
    TEMPLATE_SOURCE_DIR="$SCRIPT_DIR"
fi

# Target directory
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
echo "Category:   $PLUGIN_CATEGORY"
echo "Repository: $REPO_NAME"
echo "Template:   $TEMPLATE_SOURCE_DIR"
echo "Target:     $TARGET_DIR"
echo "=========================================="

# Create target directory
mkdir -p "$TARGET_DIR"

# Detect sed behavior (BSD vs GNU)
SED_INPLACE=(-i '')
if sed --version 2>/dev/null | grep -q 'GNU'; then
    SED_INPLACE=(-i)
fi

# Copy template source code
echo ""
echo "[1/7] Copying template source code..."
if [ -d "$TEMPLATE_SOURCE_DIR/src" ]; then
    cp -r "$TEMPLATE_SOURCE_DIR/src" "$TARGET_DIR/"
fi
if [ -d "$TEMPLATE_SOURCE_DIR/tests" ]; then
    cp -r "$TEMPLATE_SOURCE_DIR/tests" "$TARGET_DIR/"
fi
if [ -d "$TEMPLATE_SOURCE_DIR/database" ]; then
    cp -r "$TEMPLATE_SOURCE_DIR/database" "$TARGET_DIR/"
fi
if [ -d "$TEMPLATE_SOURCE_DIR/k8s" ]; then
    cp -r "$TEMPLATE_SOURCE_DIR/k8s" "$TARGET_DIR/"
fi

# Copy config files
for config_file in package.json tsconfig.json jest.config.js .eslintrc.js nexus.manifest.json Dockerfile .dockerignore .env.example .gitignore; do
    if [ -f "$TEMPLATE_SOURCE_DIR/$config_file" ]; then
        cp "$TEMPLATE_SOURCE_DIR/$config_file" "$TARGET_DIR/"
    fi
done

# Copy UI
echo "[2/7] Copying UI template..."
if [ -d "$TEMPLATE_SOURCE_DIR/ui" ]; then
    cp -r "$TEMPLATE_SOURCE_DIR/ui" "$TARGET_DIR/"
fi

# Copy documentation and community files
echo "[3/7] Copying documentation..."
if [ -d "$SCRIPT_DIR/docs" ]; then
    cp -r "$SCRIPT_DIR/docs" "$TARGET_DIR/"
fi
for doc_file in LICENSE CODE_OF_CONDUCT.md CONTRIBUTING.md SECURITY.md; do
    if [ -f "$SCRIPT_DIR/$doc_file" ]; then
        cp "$SCRIPT_DIR/$doc_file" "$TARGET_DIR/"
    fi
done

# Copy GitHub workflows
echo "[4/7] Copying CI/CD workflows..."
if [ -d "$SCRIPT_DIR/.github" ]; then
    mkdir -p "$TARGET_DIR/.github"
    cp -r "$SCRIPT_DIR/.github/"* "$TARGET_DIR/.github/"
fi

# Create additional directories
echo "[5/7] Creating directory structure..."
mkdir -p "$TARGET_DIR/assets/"{screenshots,diagrams}

# Replace ALL template placeholders in ALL files
echo "[6/7] Customizing template variables..."
cd "$TARGET_DIR"

# Find all text files and replace placeholders
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
            -e "s/{{PLUGIN_NAME_UPPER}}/${PLUGIN_NAME_UPPER}/g" \
            -e "s/{{REPO_NAME}}/${REPO_NAME}/g" \
            -e "s/{{PLUGIN_CATEGORY}}/${PLUGIN_CATEGORY}/g" \
            "$file" 2>/dev/null || true
    fi
done

# Create .env from .env.example
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
fi

# Initialize git repo if not already
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
echo "  npm install"
echo "  npm run build"
echo "  npm start"
echo ""
echo "  # Start UI development:"
echo "  cd ui && npm install && npm run dev"
echo ""
echo "  # Build Docker image:"
echo "  npm run docker:build"
echo ""
echo "  # Run tests:"
echo "  npm test"
echo ""
echo "Server will be available at http://localhost:8080"
echo "UI will be available at http://localhost:3000"
echo ""
