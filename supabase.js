/**
 * Supabase Client Configuration for DeBabel Server
 * ES Module Version
 * 
 * This file creates two Supabase clients:
 * 1. supabase - For JWT verification and client operations
 * 2. supabaseAdmin - For server-side operations with full access (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js';

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

/**
 * Admin client with service role key
 * 
 * Use this for:
 * - Server-side database operations
 * - Operations that need to bypass RLS
 * - Admin functions
 * 
 * WARNING: Never expose service role key to client!
 * This key has full database access and bypasses Row Level Security.
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Regular client with anon key
 * 
 * Use this for:
 * - JWT token verification
 * - Public operations
 * - RLS-enabled queries (respects user permissions)
 */
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('✅ Supabase clients initialized successfully');
console.log(`📍 Supabase URL: ${process.env.SUPABASE_URL}`);
