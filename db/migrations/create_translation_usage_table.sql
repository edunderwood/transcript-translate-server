-- Migration: Create translation_usage table
-- Purpose: Track Google Translate API character usage per church
-- Date: 2025-10-17

CREATE TABLE IF NOT EXISTS translation_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    service_id VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    character_count INTEGER NOT NULL,
    client_count INTEGER DEFAULT 0,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT translation_usage_positive_chars CHECK (character_count > 0)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_translation_usage_church_date
    ON translation_usage(church_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_translation_usage_service
    ON translation_usage(service_id);

CREATE INDEX IF NOT EXISTS idx_translation_usage_language
    ON translation_usage(language);

CREATE INDEX IF NOT EXISTS idx_translation_usage_created_at
    ON translation_usage(created_at DESC);

-- Add comment to table
COMMENT ON TABLE translation_usage IS 'Tracks character usage for Google Translate API per church, service, and language';
COMMENT ON COLUMN translation_usage.church_id IS 'References the church using the translation service';
COMMENT ON COLUMN translation_usage.service_id IS 'Service ID string (e.g., ABC-123)';
COMMENT ON COLUMN translation_usage.language IS 'Target translation language code (e.g., es, fr, zh)';
COMMENT ON COLUMN translation_usage.character_count IS 'Number of characters sent to Google Translate';
COMMENT ON COLUMN translation_usage.client_count IS 'Number of clients that received this translation';
COMMENT ON COLUMN translation_usage.date IS 'Date of usage (for aggregation)';

-- Row Level Security (RLS) policies
ALTER TABLE translation_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own church's usage
CREATE POLICY "Users can view their own church usage"
    ON translation_usage
    FOR SELECT
    USING (
        church_id IN (
            SELECT id FROM churches WHERE user_id = auth.uid()
        )
    );

-- Policy: Service role can insert usage records
CREATE POLICY "Service role can insert usage records"
    ON translation_usage
    FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON translation_usage TO authenticated;
GRANT INSERT ON translation_usage TO service_role;
