-- Debug Script: Check Church Profile Setup
-- Run this in Supabase SQL Editor to diagnose issues

-- =====================================================
-- 1. Check if churches table exists and has correct structure
-- =====================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'churches'
ORDER BY ordinal_position;

-- =====================================================
-- 2. Check all churches in the database
-- =====================================================

SELECT
  id,
  user_id,
  name,
  church_key,
  default_service_id,
  created_at
FROM churches
ORDER BY created_at DESC;

-- =====================================================
-- 3. Check if user exists in auth.users
-- Replace 'YOUR_EMAIL_HERE' with the actual user email
-- =====================================================

SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE';

-- =====================================================
-- 4. Check if user has a church profile
-- Replace 'USER_ID_FROM_ABOVE' with the actual user ID
-- =====================================================

SELECT
  c.id,
  c.name,
  c.church_key,
  c.default_service_id,
  c.user_id,
  u.email
FROM churches c
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE c.user_id = 'USER_ID_FROM_ABOVE';

-- =====================================================
-- 5. Check Row Level Security (RLS) policies
-- =====================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'churches';

-- =====================================================
-- 6. Verify service_role can access churches
-- This query should work with service role key
-- =====================================================

SELECT COUNT(*) as total_churches FROM churches;

-- =====================================================
-- 7. SOLUTION: Create a church profile for a user
-- =====================================================

/*
-- First, get the user ID:
SELECT id FROM auth.users WHERE email = 'user@example.com';

-- Then create the church profile:
INSERT INTO churches (
  user_id,
  name,
  church_key,
  greeting,
  message,
  additional_welcome,
  waiting_message,
  host_language,
  translation_languages,
  default_service_id,
  logo_base64
) VALUES (
  'USER_ID_FROM_ABOVE',  -- Replace with actual user UUID
  'My Church Name',
  'MYCHURCH',  -- Short, unique key (e.g., 'NEFC', 'GDOT')
  'Welcome to My Church!',
  '["Real-time translation available", "Choose your language below"]'::jsonb,
  'We are glad you are here',
  'Translation service is currently offline',
  'en-US',
  '[
    {"value":"es","label":"Spanish"},
    {"value":"fr","label":"French"},
    {"value":"de","label":"German"},
    {"value":"pt","label":"Portuguese"}
  ]'::jsonb,
  '1234',  -- Default service ID
  NULL  -- Logo (optional, can add later)
);

-- Verify it was created:
SELECT * FROM churches WHERE user_id = 'USER_ID_FROM_ABOVE';
*/

-- =====================================================
-- 8. Check for missing user_id in existing churches
-- =====================================================

SELECT
  id,
  name,
  church_key,
  user_id,
  CASE
    WHEN user_id IS NULL THEN 'MISSING - NEEDS TO BE SET'
    ELSE 'OK'
  END as status
FROM churches;

-- =====================================================
-- 9. FIX: Link existing church to a user
-- =====================================================

/*
-- If you have an existing church without a user_id, link it:

-- First, get the user ID:
SELECT id FROM auth.users WHERE email = 'user@example.com';

-- Then update the church:
UPDATE churches
SET user_id = 'USER_ID_FROM_ABOVE'
WHERE church_key = 'YOUR_CHURCH_KEY';

-- Verify:
SELECT * FROM churches WHERE church_key = 'YOUR_CHURCH_KEY';
*/

-- =====================================================
-- 10. Check services for each church
-- =====================================================

SELECT
  c.name as church_name,
  c.church_key,
  s.service_id,
  s.name as service_name,
  s.status
FROM churches c
LEFT JOIN services s ON s.church_id = c.id
ORDER BY c.name;
