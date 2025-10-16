-- OpenWord Multi-Tenant Database Migration
-- FOR EXISTING TABLES - Safe to run on existing churches and services tables
-- This migration adds missing columns and updates existing structures

-- =====================================================
-- CHURCHES TABLE - Add Missing Columns
-- =====================================================

-- Add columns if they don't exist (safe to run multiple times)
DO $$
BEGIN
    -- Add name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'name'
    ) THEN
        ALTER TABLE churches ADD COLUMN name TEXT NOT NULL DEFAULT 'My Church';
    END IF;

    -- Add church_key if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'church_key'
    ) THEN
        ALTER TABLE churches ADD COLUMN church_key TEXT NOT NULL DEFAULT 'DEFAULT';
    END IF;

    -- Add greeting if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'greeting'
    ) THEN
        ALTER TABLE churches ADD COLUMN greeting TEXT DEFAULT 'Welcome!';
    END IF;

    -- Add message if missing (JSONB array of messages)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'message'
    ) THEN
        ALTER TABLE churches ADD COLUMN message JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add additional_welcome if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'additional_welcome'
    ) THEN
        ALTER TABLE churches ADD COLUMN additional_welcome TEXT DEFAULT '';
    END IF;

    -- Add waiting_message if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'waiting_message'
    ) THEN
        ALTER TABLE churches ADD COLUMN waiting_message TEXT DEFAULT 'Service is currently offline';
    END IF;

    -- Add logo_base64 if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'logo_base64'
    ) THEN
        ALTER TABLE churches ADD COLUMN logo_base64 TEXT;
    END IF;

    -- Add host_language if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'host_language'
    ) THEN
        ALTER TABLE churches ADD COLUMN host_language TEXT DEFAULT 'en-US';
    END IF;

    -- Add translation_languages if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'translation_languages'
    ) THEN
        ALTER TABLE churches ADD COLUMN translation_languages JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add default_service_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'default_service_id'
    ) THEN
        ALTER TABLE churches ADD COLUMN default_service_id TEXT DEFAULT '1234';
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'churches' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE churches ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Ensure church_key is unique (if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'churches_church_key_unique'
    ) THEN
        ALTER TABLE churches ADD CONSTRAINT churches_church_key_unique UNIQUE (church_key);
    END IF;
END $$;

-- Add church_key format constraint (if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'church_key_format'
    ) THEN
        ALTER TABLE churches ADD CONSTRAINT church_key_format
            CHECK (church_key ~ '^[A-Za-z0-9_-]+$');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SERVICES TABLE - Add Missing Columns
-- =====================================================

DO $$
BEGIN
    -- Add church_id if missing (critical for multi-tenancy)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'church_id'
    ) THEN
        -- Add column as nullable first
        ALTER TABLE services ADD COLUMN church_id UUID;

        -- You'll need to populate this manually for existing services
        -- Example: UPDATE services SET church_id = (SELECT id FROM churches WHERE church_key = 'YOUR_KEY');

        -- After populating, uncomment this to make it required:
        -- ALTER TABLE services ALTER COLUMN church_id SET NOT NULL;
        -- ALTER TABLE services ADD CONSTRAINT services_church_id_fkey
        --     FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;
    END IF;

    -- Add service_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'service_id'
    ) THEN
        ALTER TABLE services ADD COLUMN service_id TEXT NOT NULL DEFAULT '1234';
    END IF;

    -- Add name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'name'
    ) THEN
        ALTER TABLE services ADD COLUMN name TEXT DEFAULT 'Main Service';
    END IF;

    -- Add status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'status'
    ) THEN
        ALTER TABLE services ADD COLUMN status TEXT DEFAULT 'inactive';
    END IF;

    -- Add status check constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'services_status_check'
    ) THEN
        ALTER TABLE services ADD CONSTRAINT services_status_check
            CHECK (status IN ('active', 'inactive'));
    END IF;

    -- Add active_languages if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'active_languages'
    ) THEN
        ALTER TABLE services ADD COLUMN active_languages JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add started_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE services ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add ended_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'ended_at'
    ) THEN
        ALTER TABLE services ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE services ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Ensure service_id is unique (if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'services_service_id_unique'
    ) THEN
        ALTER TABLE services ADD CONSTRAINT services_service_id_unique UNIQUE (service_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SESSIONS TABLE (Create if doesn't exist)
-- =====================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  socket_id TEXT,
  language TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES - Add if missing
-- =====================================================

-- Churches indexes
CREATE INDEX IF NOT EXISTS idx_churches_church_key ON churches(church_key);
CREATE INDEX IF NOT EXISTS idx_churches_user_id ON churches(user_id);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_service_id ON services(service_id);
CREATE INDEX IF NOT EXISTS idx_services_church_id ON services(church_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status) WHERE status = 'active';

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_service_id ON sessions(service_id);
CREATE INDEX IF NOT EXISTS idx_sessions_joined_at ON sessions(joined_at);

-- =====================================================
-- TRIGGERS - Update existing or create new
-- =====================================================

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist and recreate
DROP TRIGGER IF EXISTS update_churches_updated_at ON churches;
CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate (to ensure they're correct)

-- Churches policies
DROP POLICY IF EXISTS "Users can view own church" ON churches;
CREATE POLICY "Users can view own church"
  ON churches FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own church" ON churches;
CREATE POLICY "Users can update own church"
  ON churches FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own church" ON churches;
CREATE POLICY "Users can create own church"
  ON churches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can read all churches" ON churches;
CREATE POLICY "Service role can read all churches"
  ON churches FOR SELECT
  TO service_role
  USING (true);

-- Services policies
DROP POLICY IF EXISTS "Users can view own services" ON services;
CREATE POLICY "Users can view own services"
  ON services FOR SELECT
  USING (
    church_id IN (
      SELECT id FROM churches WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own services" ON services;
CREATE POLICY "Users can create own services"
  ON services FOR INSERT
  WITH CHECK (
    church_id IN (
      SELECT id FROM churches WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own services" ON services;
CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  USING (
    church_id IN (
      SELECT id FROM churches WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can read all services" ON services;
CREATE POLICY "Service role can read all services"
  ON services FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can update all services" ON services;
CREATE POLICY "Service role can update all services"
  ON services FOR UPDATE
  TO service_role
  USING (true);

-- Sessions policies
DROP POLICY IF EXISTS "Service role can manage sessions" ON sessions;
CREATE POLICY "Service role can manage sessions"
  ON sessions FOR ALL
  TO service_role
  USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get church by church_key (public lookup)
CREATE OR REPLACE FUNCTION get_church_by_key(key TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  church_key TEXT,
  greeting TEXT,
  message JSONB,
  additional_welcome TEXT,
  waiting_message TEXT,
  logo_base64 TEXT,
  host_language TEXT,
  translation_languages JSONB,
  default_service_id TEXT
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.name, c.church_key, c.greeting, c.message,
    c.additional_welcome, c.waiting_message, c.logo_base64,
    c.host_language, c.translation_languages, c.default_service_id
  FROM churches c
  WHERE c.church_key = key;
END;
$$ LANGUAGE plpgsql;

-- Function: Get active services for a church
CREATE OR REPLACE FUNCTION get_active_services_for_church(key TEXT)
RETURNS TABLE (
  service_id TEXT,
  name TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  active_languages JSONB
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT s.service_id, s.name, s.started_at, s.active_languages
  FROM services s
  INNER JOIN churches c ON s.church_id = c.id
  WHERE c.church_key = key AND s.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA MIGRATION HELPERS
-- =====================================================

-- If you have existing services without church_id, you'll need to link them
-- Run this manually after updating the church_id column above

-- Example: Link all existing services to a specific church
-- UPDATE services
-- SET church_id = (SELECT id FROM churches WHERE church_key = 'YOUR_CHURCH_KEY')
-- WHERE church_id IS NULL;

-- Or if you need to create a default church first:
-- INSERT INTO churches (user_id, name, church_key, greeting, message, translation_languages, default_service_id)
-- VALUES (
--   'YOUR_USER_UUID',
--   'Default Church',
--   'DEFAULT',
--   'Welcome!',
--   '["Translation services available"]'::jsonb,
--   '[{"value":"es","label":"Spanish"}]'::jsonb,
--   '1234'
-- );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify the migration worked:

-- Check churches table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'churches'
-- ORDER BY ordinal_position;

-- Check services table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'services'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('churches', 'services', 'sessions')
-- ORDER BY tablename, indexname;

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('churches', 'services', 'sessions')
-- ORDER BY tablename, policyname;

-- =====================================================
-- POST-MIGRATION STEPS
-- =====================================================

/*
After running this migration:

1. LINK EXISTING SERVICES TO CHURCHES:
   If you have existing services, you need to set their church_id.

   Option A - Link all services to one church:

   UPDATE services
   SET church_id = (SELECT id FROM churches WHERE church_key = 'YOUR_KEY')
   WHERE church_id IS NULL;

   Option B - Create services for each church:

   -- For each church, ensure they have a default service:
   INSERT INTO services (church_id, service_id, name, status)
   SELECT
     c.id,
     c.default_service_id,
     'Main Service',
     'inactive'
   FROM churches c
   WHERE NOT EXISTS (
     SELECT 1 FROM services s WHERE s.church_id = c.id
   );

2. MAKE CHURCH_ID REQUIRED (after linking services):

   ALTER TABLE services ALTER COLUMN church_id SET NOT NULL;

   ALTER TABLE services ADD CONSTRAINT services_church_id_fkey
     FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

3. UPDATE CHURCH KEYS:
   Make sure each church has a unique, meaningful church_key:

   UPDATE churches SET church_key = 'NEFC' WHERE name LIKE '%New England%';
   UPDATE churches SET church_key = 'GDOT' WHERE name LIKE '%Gdot%';

4. POPULATE TRANSLATION LANGUAGES:

   UPDATE churches
   SET translation_languages = '[
     {"value":"es","label":"Spanish"},
     {"value":"fr","label":"French"},
     {"value":"de","label":"German"}
   ]'::jsonb
   WHERE id = 'your-church-id';

5. TEST THE MIGRATION:

   -- Test church lookup:
   SELECT * FROM get_church_by_key('YOUR_CHURCH_KEY');

   -- Test service access:
   SELECT * FROM services WHERE church_id = (
     SELECT id FROM churches WHERE church_key = 'YOUR_CHURCH_KEY'
   );

   -- Test RLS (as authenticated user):
   SET request.jwt.claims.sub = 'your-user-id';
   SELECT * FROM churches;  -- Should only see your church
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Link existing services to churches (UPDATE services SET church_id = ...)';
  RAISE NOTICE '2. Make church_id required (ALTER TABLE services ALTER COLUMN church_id SET NOT NULL)';
  RAISE NOTICE '3. Verify church keys are unique and meaningful';
  RAISE NOTICE '4. Populate translation_languages for each church';
  RAISE NOTICE '5. Test with: SELECT * FROM get_church_by_key(''YOUR_KEY'');';
  RAISE NOTICE '';
  RAISE NOTICE 'See comments at end of migration file for detailed instructions.';
END $$;
