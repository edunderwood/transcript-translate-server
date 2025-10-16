-- OpenWord Multi-Tenant Database Schema
-- This schema supports multiple churches/organizations using the same server
-- Each church has its own configuration, services, and branding

-- =====================================================
-- CHURCHES TABLE
-- Stores organization-specific configuration and branding
-- =====================================================
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Organization Identity
  name TEXT NOT NULL,
  church_key TEXT NOT NULL UNIQUE, -- Public identifier (e.g., 'NEFC', 'GDot')

  -- Branding & Messaging
  greeting TEXT DEFAULT 'Welcome!',
  message JSONB DEFAULT '[]'::jsonb, -- Array of welcome messages
  additional_welcome TEXT DEFAULT '',
  waiting_message TEXT DEFAULT 'Service is currently offline',
  logo_base64 TEXT, -- Base64 encoded logo image

  -- Translation Configuration
  host_language TEXT DEFAULT 'en-US', -- Source language for transcription
  translation_languages JSONB DEFAULT '[]'::jsonb, -- Array of available translation languages
  default_service_id TEXT DEFAULT '1234', -- Default service identifier

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure church_key follows a valid format (alphanumeric, underscore, hyphen)
  CONSTRAINT church_key_format CHECK (church_key ~ '^[A-Za-z0-9_-]+$')
);

-- Index for fast lookups by church_key (used by public endpoints)
CREATE INDEX IF NOT EXISTS idx_churches_church_key ON churches(church_key);

-- Index for user lookup (used by authenticated endpoints)
CREATE INDEX IF NOT EXISTS idx_churches_user_id ON churches(user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SERVICES TABLE
-- Stores individual translation services/sessions for each church
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

  -- Service Identity
  service_id TEXT NOT NULL, -- String identifier (e.g., 'SVC_123', '1234')
  name TEXT DEFAULT 'Main Service',

  -- Service State
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  active_languages JSONB DEFAULT '[]'::jsonb, -- Currently active translation languages

  -- Session Timing
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure service_id is unique globally
  CONSTRAINT services_service_id_unique UNIQUE (service_id)
);

-- Index for fast lookups by service_id (used by Socket.IO and public endpoints)
CREATE INDEX IF NOT EXISTS idx_services_service_id ON services(service_id);

-- Index for church lookup
CREATE INDEX IF NOT EXISTS idx_services_church_id ON services(church_id);

-- Index for finding active services
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status) WHERE status = 'active';

-- Auto-update updated_at timestamp
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SESSIONS TABLE (Optional - for analytics)
-- Tracks individual participant sessions for analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

  -- Session Data
  socket_id TEXT, -- Socket.IO connection ID
  language TEXT, -- Selected translation language
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER, -- Calculated on disconnect

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for service analytics
CREATE INDEX IF NOT EXISTS idx_sessions_service_id ON sessions(service_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_sessions_joined_at ON sessions(joined_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own church data
-- =====================================================

-- Enable RLS on churches table
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own church
CREATE POLICY "Users can view own church"
  ON churches FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own church
CREATE POLICY "Users can update own church"
  ON churches FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own church (during registration)
CREATE POLICY "Users can create own church"
  ON churches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service accounts can read all churches (for public endpoints)
-- Note: This requires using supabaseAdmin in server code
CREATE POLICY "Service role can read all churches"
  ON churches FOR SELECT
  TO service_role
  USING (true);

-- Enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view services for their church
CREATE POLICY "Users can view own services"
  ON services FOR SELECT
  USING (
    church_id IN (
      SELECT id FROM churches WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create services for their church
CREATE POLICY "Users can create own services"
  ON services FOR INSERT
  WITH CHECK (
    church_id IN (
      SELECT id FROM churches WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update services for their church
CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  USING (
    church_id IN (
      SELECT id FROM churches WHERE user_id = auth.uid()
    )
  );

-- Policy: Service accounts can read all services (for public endpoints)
CREATE POLICY "Service role can read all services"
  ON services FOR SELECT
  TO service_role
  USING (true);

-- Policy: Service accounts can update all services (for status updates)
CREATE POLICY "Service role can update all services"
  ON services FOR UPDATE
  TO service_role
  USING (true);

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Service accounts can manage all sessions
CREATE POLICY "Service role can manage sessions"
  ON sessions FOR ALL
  TO service_role
  USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- Useful functions for querying and managing data
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
-- SAMPLE DATA (for testing)
-- Uncomment and modify as needed for local development
-- =====================================================

-- Example: Insert a test church (requires a valid user_id from auth.users)
-- INSERT INTO churches (
--   user_id, name, church_key, greeting, message,
--   host_language, translation_languages, default_service_id
-- ) VALUES (
--   'YOUR_USER_UUID_HERE',
--   'Test Church',
--   'TEST',
--   'Welcome to Test Church',
--   '["Join us for worship!", "Translation services available"]'::jsonb,
--   'en-US',
--   '[
--     {"value": "es", "label": "Spanish"},
--     {"value": "fr", "label": "French"},
--     {"value": "de", "label": "German"}
--   ]'::jsonb,
--   '1234'
-- );

-- =====================================================
-- MIGRATION NOTES
-- =====================================================
--
-- To apply this schema to your Supabase project:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste this entire file
-- 5. Run the query
--
-- To verify the schema:
-- - Check Tables: Browse the 'churches' and 'services' tables
-- - Check Policies: Go to Authentication > Policies
-- - Check Indexes: Query pg_indexes for performance verification
--
-- For production deployments:
-- 1. Backup existing data first
-- 2. Test in a staging environment
-- 3. Apply during low-traffic period
-- 4. Monitor logs after deployment
