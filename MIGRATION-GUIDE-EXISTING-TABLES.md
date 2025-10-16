# Migration Guide for Existing Tables

Since you already have `churches` and `services` tables in Supabase, follow this step-by-step guide to safely upgrade to the multi-tenant structure.

## Step 1: Backup Your Data

Before running any migration, backup your existing data:

```sql
-- In Supabase SQL Editor, run these to see your current data:
SELECT * FROM churches;
SELECT * FROM services;

-- Copy the results and save them somewhere safe
```

## Step 2: Run the Migration

1. Open your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open `transcript-translate-server/supabase-migration-existing.sql`
5. Copy and paste the entire contents
6. Click **Run**

The migration will:
- ✅ Add any missing columns to `churches` table
- ✅ Add any missing columns to `services` table
- ✅ Create `sessions` table if it doesn't exist
- ✅ Update triggers (replaces old ones)
- ✅ Add indexes for performance
- ✅ Set up Row Level Security (RLS) policies

## Step 3: Link Services to Churches

After the migration, you need to link existing services to churches.

### Check Current State

```sql
-- See which services don't have a church_id
SELECT id, service_id, name, church_id
FROM services
WHERE church_id IS NULL;

-- See your existing churches
SELECT id, name, church_key, user_id
FROM churches;
```

### Option A: Link All Services to One Church

If you only have one church:

```sql
-- Link all services without church_id to your church
UPDATE services
SET church_id = (SELECT id FROM churches WHERE church_key = 'YOUR_CHURCH_KEY')
WHERE church_id IS NULL;
```

### Option B: Create Services for Each Church

If you have multiple churches:

```sql
-- Create a default service for each church that doesn't have one
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
```

### Verify Linking

```sql
-- Check that all services now have a church_id
SELECT
  s.service_id,
  s.name,
  s.church_id,
  c.church_key,
  c.name as church_name
FROM services s
LEFT JOIN churches c ON s.church_id = c.id;

-- If any show NULL church_id, fix them manually:
-- UPDATE services SET church_id = 'church-uuid-here' WHERE id = 'service-uuid-here';
```

## Step 4: Make church_id Required

After all services are linked to churches:

```sql
-- Make church_id required (this will fail if any services have NULL church_id)
ALTER TABLE services ALTER COLUMN church_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE services ADD CONSTRAINT services_church_id_fkey
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;
```

## Step 5: Update Church Keys

Make sure each church has a unique, memorable church_key:

```sql
-- Check current church keys
SELECT id, name, church_key, user_id FROM churches;

-- Update church keys to be short and memorable
UPDATE churches SET church_key = 'NEFC' WHERE name LIKE '%New England%';
UPDATE churches SET church_key = 'GDOT' WHERE name LIKE '%Gdot%';
UPDATE churches SET church_key = 'CHAPEL' WHERE name LIKE '%Chapel%';

-- Or set based on user_id if you know it
UPDATE churches SET church_key = 'MYKEY' WHERE user_id = 'user-uuid-here';
```

**Church Key Rules:**
- Must be unique across all churches
- 3-10 characters recommended
- Alphanumeric, hyphens, underscores only
- Case-sensitive
- Used in participant URLs: `?church=YOUR_KEY`

## Step 6: Populate Translation Languages

Add translation languages for each church:

```sql
-- Update translation languages (customize for each church)
UPDATE churches
SET translation_languages = '[
  {"value": "es", "label": "Spanish"},
  {"value": "fr", "label": "French"},
  {"value": "de", "label": "German"},
  {"value": "pt", "label": "Portuguese"}
]'::jsonb
WHERE church_key = 'YOUR_KEY';

-- Or for all churches at once (same languages):
UPDATE churches
SET translation_languages = '[
  {"value": "es", "label": "Spanish"},
  {"value": "fr", "label": "French"}
]'::jsonb
WHERE translation_languages IS NULL OR translation_languages = '[]'::jsonb;
```

## Step 7: Verify the Migration

Run these queries to ensure everything is set up correctly:

### Test Church Configuration

```sql
-- Test the helper function (should return church data)
SELECT * FROM get_church_by_key('YOUR_CHURCH_KEY');

-- Should show:
-- id, name, church_key, greeting, message, logo, languages, etc.
```

### Test RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('churches', 'services', 'sessions');

-- All should show rowsecurity = true

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('churches', 'services', 'sessions')
ORDER BY tablename;

-- Should see multiple policies for each table
```

### Test Data Structure

```sql
-- Verify churches have all required fields
SELECT
  church_key,
  name,
  greeting,
  host_language,
  default_service_id,
  jsonb_array_length(translation_languages) as num_languages
FROM churches;

-- Verify services are linked to churches
SELECT
  c.church_key,
  c.name as church_name,
  s.service_id,
  s.name as service_name,
  s.status
FROM services s
JOIN churches c ON s.church_id = c.id;
```

## Step 8: Update Environment Variables

No changes needed to environment variables! The server code already supports the multi-tenant structure.

Just ensure you have:

```bash
# In Render
SUPABASE_URL=your-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEBABEL_CLIENT_APP=https://your-client.vercel.app
```

## Step 9: Test the Application

### Test 1: API Endpoint

```bash
# Test church info endpoint
curl "https://your-server.onrender.com/church/info?church=YOUR_CHURCH_KEY"

# Should return JSON with church configuration
```

### Test 2: Client Application

Visit in browser:
```
https://your-client.vercel.app?church=YOUR_CHURCH_KEY&serviceId=1234
```

Should display:
- ✅ Church-specific greeting
- ✅ Church-specific messages
- ✅ Church logo (if set)
- ✅ Available translation languages

### Test 3: Control Panel

1. Log in: `https://your-client.vercel.app/control`
2. Should see:
   - Church information (name, key)
   - QR code generation button
   - Service controls
3. Click "Generate QR Code" or it should auto-generate
4. Scan QR code - should include `?church=YOUR_KEY` parameter

### Test 4: Multiple Churches

If you have multiple churches:

1. Create second test church:
```sql
INSERT INTO churches (user_id, name, church_key, greeting, message, translation_languages, default_service_id)
VALUES (
  'different-user-id',
  'Test Church B',
  'TESTB',
  'Welcome to Church B',
  '["Different church, different message"]'::jsonb,
  '[{"value":"fr","label":"French"}]'::jsonb,
  'B001'
);
```

2. Visit both URLs:
   - `?church=YOUR_KEY&serviceId=1234` (Church A)
   - `?church=TESTB&serviceId=B001` (Church B)

3. Verify they show different content

## Common Issues

### Issue: "church_id cannot be null"

If you get this error when making church_id required:

```sql
-- Find services without church_id
SELECT * FROM services WHERE church_id IS NULL;

-- Fix them (replace 'church-uuid' with actual church ID)
UPDATE services SET church_id = 'church-uuid' WHERE church_id IS NULL;
```

### Issue: "duplicate key value violates unique constraint"

If church_key is not unique:

```sql
-- Find duplicate church keys
SELECT church_key, COUNT(*)
FROM churches
GROUP BY church_key
HAVING COUNT(*) > 1;

-- Update duplicates with unique keys
UPDATE churches
SET church_key = CONCAT(church_key, '_', id::text)
WHERE church_key IN (
  SELECT church_key FROM churches GROUP BY church_key HAVING COUNT(*) > 1
);
```

### Issue: "permission denied for table churches"

RLS is blocking access. Use service role key in your server:

```javascript
// In server code, ensure using supabaseAdmin (not supabase client)
import { supabaseAdmin } from './supabase.js';

// Use supabaseAdmin for all church queries
const { data } = await supabaseAdmin
  .from('churches')
  .select('*')
  .eq('church_key', key)
  .single();
```

### Issue: Translation languages not showing

```sql
-- Check format of translation_languages
SELECT church_key, translation_languages FROM churches;

-- Should be JSON array like:
-- [{"value":"es","label":"Spanish"}]

-- Fix if needed:
UPDATE churches
SET translation_languages = '[
  {"value":"es","label":"Spanish"}
]'::jsonb
WHERE church_key = 'YOUR_KEY';
```

## Rollback (If Needed)

If something goes wrong, you can remove added columns:

```sql
-- DANGER: This will delete data! Only use if needed

-- Remove added columns from churches
ALTER TABLE churches DROP COLUMN IF EXISTS church_key;
ALTER TABLE churches DROP COLUMN IF EXISTS greeting;
-- ... etc for other columns

-- Remove added columns from services
ALTER TABLE services DROP COLUMN IF EXISTS church_id;
ALTER TABLE services DROP COLUMN IF EXISTS service_id;
-- ... etc

-- Drop sessions table
DROP TABLE IF EXISTS sessions;

-- Restore from backup (paste your saved data)
```

## Summary

After completing these steps, you'll have:

✅ Multi-tenant database structure
✅ Churches with unique keys and branding
✅ Services linked to churches
✅ Row Level Security enforcing data isolation
✅ Helper functions for easy queries
✅ QR codes with church-specific URLs
✅ Client fetching church-specific configuration

## Next Steps

1. **Deploy Changes**: Push updated code to Render and Vercel
2. **Generate QR Codes**: Log into control panel and generate QR codes for each church
3. **Share URLs**: Give each church their participant URL with their church_key
4. **Monitor**: Check Render and Supabase logs for any issues

Need help? Check:
- `MULTI-TENANT-SETUP.md` - Full deployment guide
- `IMPLEMENTATION-SUMMARY.md` - What changed and why
- Supabase logs - Database query errors
- Render logs - Server errors
