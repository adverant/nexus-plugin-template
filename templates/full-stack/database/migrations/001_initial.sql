-- ============================================================================
-- Initial Schema for {{PLUGIN_DISPLAY_NAME}}
-- ============================================================================
-- This migration creates the base tables for the plugin.
-- All tables include organization_id for multi-tenant isolation.
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Items table: the primary data model for this plugin.
-- Replace or extend this with your plugin's actual data model.
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_items_org ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_items_created ON items(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_name_search ON items USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
