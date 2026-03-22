-- ============================================================================
-- {{PLUGIN_DISPLAY_NAME}} - Initial Schema
-- ============================================================================
-- CUSTOMIZE: Replace 'plugin' schema name with your plugin's name

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create plugin schema
-- CUSTOMIZE: Rename schema to your plugin (e.g., 'crm', 'design', 'health')
CREATE SCHEMA IF NOT EXISTS plugin;

SET search_path TO plugin, public;

-- ============================================================================
-- Example: Entity Table
-- ============================================================================
-- CUSTOMIZE: Replace with your actual tables

CREATE TABLE plugin.entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,  -- References auth.users(id) from nexus-auth
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_status CHECK (status IN ('draft', 'active', 'archived'))
);

-- Indexes
CREATE INDEX idx_entities_user_id ON plugin.entities(user_id);
CREATE INDEX idx_entities_status ON plugin.entities(status);
CREATE INDEX idx_entities_created_at ON plugin.entities(created_at DESC);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION plugin.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entities_updated_at
    BEFORE UPDATE ON plugin.entities
    FOR EACH ROW
    EXECUTE FUNCTION plugin.update_updated_at();
