-- ============================================================
-- MIGRATION: Rename churches to organisations
-- ============================================================
-- This script renames all "church" references to "organisation"
-- to make the system more generic and applicable to any organization type.
--
-- IMPORTANT: This is a breaking change. Backup your database before running!
--
-- Usage:
-- 1. Backup your database
-- 2. Run this script in Supabase SQL Editor
-- 3. Update your application code to use new names
-- 4. Update environment variables (CHURCH_* → ORGANISATION_*)
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Rename the main table
-- ============================================================

-- Rename churches table to organisations
ALTER TABLE IF EXISTS churches
RENAME TO organisations;

-- ============================================================
-- STEP 2: Rename columns in organisations table
-- ============================================================

-- Rename church_key to organisation_key
ALTER TABLE organisations
RENAME COLUMN church_key TO organisation_key;

-- ============================================================
-- STEP 3: Update indexes
-- ============================================================

-- Rename indexes to match new table name
ALTER INDEX IF EXISTS idx_churches_church_key
RENAME TO idx_organisations_organisation_key;

ALTER INDEX IF EXISTS idx_churches_user_id
RENAME TO idx_organisations_user_id;

-- ============================================================
-- STEP 4: Rename triggers
-- ============================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS update_churches_updated_at ON organisations;

-- Recreate trigger with new name
CREATE TRIGGER update_organisations_updated_at
    BEFORE UPDATE ON organisations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 5: Update foreign key column in services table
-- ============================================================

-- Rename church_id to organisation_id in services table
ALTER TABLE services
RENAME COLUMN church_id TO organisation_id;

-- Foreign key constraint is automatically maintained by PostgreSQL

-- ============================================================
-- STEP 6: Update translation_usage table foreign key
-- ============================================================

-- Rename church_id to organisation_id in translation_usage table
ALTER TABLE IF EXISTS translation_usage
RENAME COLUMN church_id TO organisation_id;

-- ============================================================
-- STEP 7: Update or recreate database functions
-- ============================================================

-- Drop old functions
DROP FUNCTION IF EXISTS get_church_by_key(TEXT);
DROP FUNCTION IF EXISTS get_active_services_for_church(TEXT);

-- Recreate function: get_organisation_by_key
CREATE OR REPLACE FUNCTION get_organisation_by_key(key TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    organisation_key TEXT,
    greeting TEXT,
    message TEXT,
    additional_welcome TEXT,
    waiting_message TEXT,
    logo_base64 TEXT,
    host_language TEXT,
    translation_languages TEXT[],
    default_service_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.user_id,
        o.name,
        o.organisation_key,
        o.greeting,
        o.message,
        o.additional_welcome,
        o.waiting_message,
        o.logo_base64,
        o.host_language,
        o.translation_languages,
        o.default_service_id,
        o.created_at,
        o.updated_at
    FROM organisations o
    WHERE o.organisation_key = key;
END;
$$;

-- Recreate function: get_active_services_for_organisation
CREATE OR REPLACE FUNCTION get_active_services_for_organisation(key TEXT)
RETURNS TABLE (
    service_id TEXT,
    organisation_id UUID,
    organisation_name TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.service_id,
        s.organisation_id,
        o.name AS organisation_name,
        s.is_active,
        s.created_at
    FROM services s
    INNER JOIN organisations o ON s.organisation_id = o.id
    WHERE o.organisation_key = key
    ORDER BY s.created_at DESC;
END;
$$;

-- ============================================================
-- STEP 8: Update Row Level Security (RLS) policies
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own organisation" ON organisations;
DROP POLICY IF EXISTS "Users can update their own organisation" ON organisations;
DROP POLICY IF EXISTS "Users can insert their own organisation" ON organisations;
DROP POLICY IF EXISTS "Users can delete their own organisation" ON organisations;

-- Recreate policies with updated names
CREATE POLICY "Users can view their own organisation" ON organisations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own organisation" ON organisations
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organisation" ON organisations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own organisation" ON organisations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Update services table policies
DROP POLICY IF EXISTS "Users can view services for their organisation" ON services;

CREATE POLICY "Users can view services for their organisation" ON services
    FOR SELECT
    USING (
        organisation_id IN (
            SELECT id FROM organisations WHERE user_id = auth.uid()
        )
    );

-- Update translation_usage table policies if they exist
DROP POLICY IF EXISTS "Users can view usage for their organisation" ON translation_usage;

CREATE POLICY "Users can view usage for their organisation" ON translation_usage
    FOR SELECT
    USING (
        organisation_id IN (
            SELECT id FROM organisations WHERE user_id = auth.uid()
        )
    );

-- ============================================================
-- STEP 9: Add comment to document the change
-- ============================================================

COMMENT ON TABLE organisations IS 'Organisations (formerly churches) - allows multiple organisations to use the same infrastructure. Each organisation has a unique organisation_key and configuration.';

COMMENT ON COLUMN organisations.organisation_key IS 'Public identifier for the organisation (e.g., NEFC, GDot). Used in URLs and API calls.';

-- ============================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================

-- Verify table exists
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organisations');

-- Verify columns renamed
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'organisations';

-- Verify functions exist
-- SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%organisation%';

-- Verify policies exist
-- SELECT policyname FROM pg_policies WHERE tablename = 'organisations';

COMMIT;

-- ============================================================
-- ROLLBACK SCRIPT (in case you need to revert)
-- ============================================================
--
-- BEGIN;
-- ALTER TABLE organisations RENAME TO churches;
-- ALTER TABLE organisations RENAME COLUMN organisation_key TO church_key;
-- ALTER TABLE services RENAME COLUMN organisation_id TO church_id;
-- ALTER TABLE translation_usage RENAME COLUMN organisation_id TO church_id;
-- ALTER INDEX idx_organisations_organisation_key RENAME TO idx_churches_church_key;
-- ALTER INDEX idx_organisations_user_id RENAME TO idx_churches_user_id;
-- DROP TRIGGER update_organisations_updated_at ON churches;
-- CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON churches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- -- Recreate old functions...
-- COMMIT;
-- ============================================================
