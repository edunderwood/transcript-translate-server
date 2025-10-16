
# OpenWord Multi-Tenant Setup Guide

This guide explains how to deploy and configure OpenWord as a true multi-tenant system, where multiple churches/organizations can use the same server infrastructure with their own branding and configuration.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Setup (Supabase)](#database-setup-supabase)
3. [Server Deployment (Render)](#server-deployment-render)
4. [Client Deployment (Vercel)](#client-deployment-vercel)
5. [Church Onboarding](#church-onboarding)
6. [Testing Multi-Tenancy](#testing-multi-tenancy)
7. [Troubleshooting](#troubleshooting)

## Architecture Overview

### How Multi-Tenancy Works

OpenWord's multi-tenant architecture allows multiple churches to use the same server with isolated data and configuration:

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenWord Platform                         │
│                                                              │
│  ┌───────────────┐    ┌───────────────┐   ┌──────────────┐ │
│  │   Church A    │    │   Church B    │   │   Church C   │ │
│  │  church_key:  │    │  church_key:  │   │ church_key:  │ │
│  │    "NEFC"     │    │    "GDOT"     │   │   "CHAPEL"   │ │
│  │               │    │               │   │              │ │
│  │ • Own logo    │    │ • Own logo    │   │ • Own logo   │ │
│  │ • Own colors  │    │ • Own colors  │   │ • Own colors │ │
│  │ • Own langs   │    │ • Own langs   │   │ • Own langs  │ │
│  │ • Own QR code │    │ • Own QR code │   │ • Own QR code│ │
│  └───────────────┘    └───────────────┘   └──────────────┘ │
│                                                              │
│         All sharing the same infrastructure:                 │
│         • Single Render server                              │
│         • Single Vercel client                              │
│         • Single Supabase database                          │
│         • Single Deepgram account                           │
│         • Single Google Translate account                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Concepts

1. **Church Key**: A unique identifier for each organization (e.g., "NEFC", "GDOT", "CHAPEL")
2. **Service ID**: A unique identifier for each translation service/session
3. **User Account**: Each church administrator has their own Supabase auth account
4. **Church Profile**: Stored in Supabase with branding, languages, and settings
5. **Participant URL**: `https://yourapp.vercel.app?church=CHURCH_KEY&serviceId=SERVICE_ID`

## Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose a name (e.g., "openword-production")
4. Set a strong database password (save it securely)
5. Select a region close to your users
6. Click "Create Project" and wait for provisioning

### Step 2: Run Database Migration

1. In your Supabase dashboard, navigate to **SQL Editor**
2. Click "New Query"
3. Open the file `transcript-translate-server/supabase-schema.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" to execute the migration

This will create:
- `churches` table (organization profiles)
- `services` table (translation services)
- `sessions` table (participant sessions)
- Row Level Security (RLS) policies
- Indexes for performance
- Helper functions

### Step 3: Verify Schema

Check that tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see: `churches`, `services`, `sessions`

### Step 4: Configure Authentication

1. Navigate to **Authentication** → **Providers**
2. Enable **Email** provider (already enabled by default)
3. Optional: Configure email templates for branding
4. Navigate to **Authentication** → **URL Configuration**
5. Add your Vercel client URL to "Site URL" and "Redirect URLs"

### Step 5: Get API Keys

1. Navigate to **Settings** → **API**
2. Copy these values (you'll need them for deployment):
   - Project URL (`SUPABASE_URL`)
   - `anon` public key (`SUPABASE_ANON_KEY`)
   - `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`) - **Keep this secret!**

## Server Deployment (Render)

### Step 1: Prepare Repository

1. Fork or clone the OpenWord repository to your GitHub account
2. Ensure the repository contains both `transcript-translate-server` and `OpenWordClient` directories

### Step 2: Create Render Service

1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `openword-server` (or your preferred name)
   - **Region**: Choose region close to your users
   - **Branch**: `main` (or your primary branch)
   - **Root Directory**: `transcript-translate-server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Instance Type**: Free (or paid for better performance)

### Step 3: Configure Environment Variables

In Render's **Environment** section, add these variables:

#### Required Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Deepgram (Speech-to-Text)
DEEPGRAM_API_KEY=your_deepgram_api_key
DEEPGRAM_PROJECT=your_deepgram_project_id

# Google Cloud Translation
USE_GOOGLE_TRANSLATE_SUBSCRIPTION=true
# If true, upload google-api-credentials.json as Secret File (see below)
# If false, uses free google-translate-api-x library

# Server Configuration
PORT=3000
NODE_ENV=production
SERVICE_TIMEOUT=90

# Client App URL (for QR code generation)
# Use DEBABEL_CLIENT_APP (recommended) or DEBABEL_CLIENT_URL (legacy)
DEBABEL_CLIENT_APP=https://your-app.vercel.app
```

#### Legacy Variables (Optional - for backward compatibility)

These are no longer required but can be set as fallbacks:

```bash
# Legacy single-tenant config (optional)
CHURCH_KEY=DEFAULT
CHURCH_NAME=OpenWord
CHURCH_GREETING=Welcome!
CHURCH_MESSAGE=["Translation services available"]
HOST_LANGUAGE=en-US
DEFAULT_SERVICE_ID=1234
TRANSLATION_LANGUAGES=[{"value":"es","label":"Spanish"}]
```

### Step 4: Upload Google API Credentials

If using Google Cloud Translation subscription mode:

1. In Render dashboard, go to **Environment**
2. Scroll to **Secret Files**
3. Click "Add Secret File"
4. **Filename**: `google-api-credentials.json`
5. **Contents**: Paste your Google Cloud service account JSON
6. Click "Save"

### Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Once deployed, note your server URL: `https://openword-server.onrender.com`

### Step 6: Verify Server

Test endpoints:

```bash
# Health check
curl https://openword-server.onrender.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

## Client Deployment (Vercel)

### Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New…" → "Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `OpenWordClient`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Step 2: Configure Environment Variables

In Vercel's **Settings** → **Environment Variables**, add:

```bash
# Backend Server URL
NEXT_PUBLIC_SERVER_NAME=https://openword-server.onrender.com

# Optional: Custom client URL (for QR codes)
NEXT_PUBLIC_CLIENT_URL=https://your-custom-domain.com
```

### Step 3: Deploy

1. Click "Deploy"
2. Wait for build and deployment (2-5 minutes)
3. Note your deployment URL: `https://openword-client.vercel.app`

### Step 4: Update Server Environment

Go back to Render and update the `DEBABEL_CLIENT_APP` variable:

```bash
DEBABEL_CLIENT_APP=https://openword-client.vercel.app
```

Click "Save" and wait for automatic redeployment.

### Step 5: Configure Custom Domain (Optional)

1. In Vercel, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `translate.yourchurch.org`)
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_CLIENT_URL` if using custom domain

## Church Onboarding

### Method 1: Self-Service Registration

1. Direct church administrators to: `https://openword-server.onrender.com/register`
2. They will:
   - Enter their email
   - Verify email address
   - Create church profile (name, key, logo, languages)
   - Receive access to control panel

### Method 2: Manual Database Entry

For admin-managed onboarding:

1. Create Supabase auth user:
   ```sql
   -- In Supabase SQL Editor
   -- This creates a user account
   -- They'll receive an email to set password
   ```

2. Insert church record:
   ```sql
   INSERT INTO churches (
     user_id,
     name,
     church_key,
     greeting,
     message,
     host_language,
     translation_languages,
     default_service_id,
     logo_base64
   ) VALUES (
     'user-uuid-from-auth-users',
     'Example Church',
     'EXAMPLE',
     'Welcome to Example Church',
     '["Join us for worship!", "Real-time translation available"]'::jsonb,
     'en-US',
     '[
       {"value": "es", "label": "Spanish"},
       {"value": "fr", "label": "French"},
       {"value": "de", "label": "German"}
     ]'::jsonb,
     '1234',
     'data:image/png;base64,...'
   );
   ```

3. Create default service:
   ```sql
   INSERT INTO services (
     church_id,
     service_id,
     name,
     status
   ) VALUES (
     'church-uuid-from-above',
     '1234',
     'Main Service',
     'inactive'
   );
   ```

### Church Key Guidelines

Church keys should be:
- **Unique**: No two churches can share the same key
- **Short**: 3-10 characters recommended
- **Alphanumeric**: Letters, numbers, hyphens, underscores only
- **Memorable**: Easy to type and share (e.g., "NEFC", "GDOT", "STMARKS")

Examples:
- ✅ Good: `NEFC`, `GDOT`, `CHAPEL`, `STMARKS`, `FAITH`
- ❌ Bad: `new-england-free-church-2024`, `ch@pel!`, `x`, `ABCDEFGHIJK`

## Testing Multi-Tenancy

### Test 1: Create Test Churches

Create two test churches in Supabase:

**Church A:**
```sql
INSERT INTO churches (user_id, name, church_key, greeting, message, translation_languages, default_service_id)
VALUES (
  'your-test-user-id-1',
  'Test Church A',
  'TESTA',
  'Welcome to Test Church A',
  '["This is Test Church A"]'::jsonb,
  '[{"value":"es","label":"Spanish"}]'::jsonb,
  'A001'
);
```

**Church B:**
```sql
INSERT INTO churches (user_id, name, church_key, greeting, message, translation_languages, default_service_id)
VALUES (
  'your-test-user-id-2',
  'Test Church B',
  'TESTB',
  'Welcome to Test Church B',
  '["This is Test Church B"]'::jsonb,
  '[{"value":"fr","label":"French"}]'::jsonb,
  'B001'
);
```

### Test 2: Verify Church Isolation

Open two browser windows:

**Window 1:**
```
https://your-app.vercel.app?church=TESTA&serviceId=A001
```

**Window 2:**
```
https://your-app.vercel.app?church=TESTB&serviceId=B001
```

Verify:
- ✅ Different greetings displayed
- ✅ Different messages shown
- ✅ Different language options available
- ✅ Different service IDs active

### Test 3: Control Panel Access

1. Log in as Church A admin: `https://your-app.vercel.app/control`
2. Verify you see Church A data only
3. Generate QR code - should contain `church=TESTA`
4. Log out and log in as Church B admin
5. Verify you see Church B data only
6. Generate QR code - should contain `church=TESTB`

### Test 4: Service Independence

1. Start service for Church A (service ID: A001)
2. Start service for Church B (service ID: B001)
3. Join as participant in Church A service
4. Join as participant in Church B service
5. Verify translation streams are independent

## Troubleshooting

### Issue: "Church not found" error

**Symptoms**: Client shows "Configuration Required" or 404 error

**Solutions**:
1. Verify church_key exists in Supabase:
   ```sql
   SELECT * FROM churches WHERE church_key = 'YOUR_KEY';
   ```
2. Check church_key spelling in URL (case-sensitive)
3. Ensure Row Level Security policies allow public read:
   ```sql
   -- Check policies
   SELECT * FROM pg_policies WHERE tablename = 'churches';
   ```

### Issue: QR code generation fails

**Symptoms**: "Unable to generate QR Code" in control panel

**Solutions**:
1. Verify `DEBABEL_CLIENT_APP` is set correctly in Render
2. Check server logs for errors
3. Ensure QR code library is installed:
   ```bash
   npm list qrcode
   ```
4. Test QR endpoint directly:
   ```bash
   curl -X POST https://your-server.onrender.com/qrcode/generate \
     -H "Content-Type: application/json" \
     -d '{"churchKey":"TEST","serviceId":"1234","format":"png"}'
   ```

### Issue: Authentication failures

**Symptoms**: Unable to log in, "Invalid credentials"

**Solutions**:
1. Verify Supabase keys are correct in Render environment
2. Check Supabase auth logs in dashboard
3. Ensure user exists in Supabase auth.users table
4. Verify email is confirmed (check auth.users.email_confirmed_at)

### Issue: Translation not working

**Symptoms**: Transcript appears but no translation

**Solutions**:
1. Check Deepgram API key is valid
2. Verify Google Translate is configured:
   - If subscription mode: check google-api-credentials.json
   - If free mode: ensure `USE_GOOGLE_TRANSLATE_SUBSCRIPTION=false`
3. Check server logs for API errors
4. Verify language codes are correct (e.g., "es" not "spanish")

### Issue: Service stays active after stopping

**Symptoms**: Service shows active even after clicking "Stop"

**Solutions**:
1. Check service status in Supabase:
   ```sql
   SELECT * FROM services WHERE service_id = 'YOUR_SERVICE_ID';
   ```
2. Manually update if needed:
   ```sql
   UPDATE services
   SET status = 'inactive', ended_at = NOW()
   WHERE service_id = 'YOUR_SERVICE_ID';
   ```
3. Clear in-memory state by restarting Render service

### Getting Help

- **GitHub Issues**: Report bugs at repository issues page
- **Server Logs**: Check Render → Logs tab for server errors
- **Client Logs**: Check browser DevTools Console for client errors
- **Database Logs**: Check Supabase → Logs for database errors

## Production Checklist

Before going live:

- [ ] Database schema applied to production Supabase
- [ ] All environment variables configured in Render
- [ ] Google API credentials uploaded as Secret File
- [ ] Custom domain configured (if using)
- [ ] SSL certificates verified (automatic with Render/Vercel)
- [ ] Test church created and verified
- [ ] QR code generation tested
- [ ] Authentication flow tested (signup, login, password reset)
- [ ] Service start/stop tested
- [ ] Translation tested with real microphone input
- [ ] Multiple simultaneous services tested
- [ ] Billing configured for Deepgram and Google Translate
- [ ] Monitoring/alerts configured
- [ ] Backup strategy documented
- [ ] Church onboarding process documented

## Maintenance

### Regular Tasks

**Daily**:
- Monitor server logs for errors
- Check Deepgram/Google Translate usage

**Weekly**:
- Review inactive churches (consider cleanup)
- Check database size and optimize if needed

**Monthly**:
- Review and archive old services/sessions
- Update dependencies (security patches)
- Review API costs and optimize

### Database Cleanup

Archive old sessions (older than 90 days):

```sql
-- Move to archive table or delete
DELETE FROM sessions
WHERE created_at < NOW() - INTERVAL '90 days';

-- Update services to reflect completed status
UPDATE services
SET status = 'inactive', ended_at = started_at + INTERVAL '2 hours'
WHERE status = 'active'
  AND started_at < NOW() - INTERVAL '1 day';
```

### Scaling Considerations

When your platform grows:

1. **Database**: Upgrade Supabase plan for more connections
2. **Server**: Upgrade Render instance type for better CPU/memory
3. **CDN**: Add Cloudflare or similar for static assets
4. **Caching**: Implement Redis for church configuration caching
5. **Load Balancing**: Deploy multiple Render instances behind load balancer

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         PARTICIPANTS                             │
│  (Scan QR code or visit URL with church parameter)              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS CLIENT (Vercel)                       │
│  • Fetches church config from server using church_key           │
│  • Displays church branding (logo, colors, greeting)            │
│  • Shows available translation languages                        │
│  • Connects to Socket.IO for real-time translations            │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXPRESS SERVER (Render)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ API Endpoints:                                             │ │
│  │  • GET /church/info?church=KEY → Church configuration     │ │
│  │  • POST /qrcode/generate → QR code with church+service    │ │
│  │  • GET /api/church/profile → Auth user's church (RLS)     │ │
│  │  • POST /api/service/:id/start → Start translation        │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Socket.IO:                                                 │ │
│  │  • Room: serviceId:language                               │ │
│  │  • Emits translations to subscribed clients               │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────┬────────────────────────┬───────────────────────┬────┘
            │                        │                       │
            ▼                        ▼                       ▼
┌───────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   SUPABASE DB     │   │   DEEPGRAM API   │   │ GOOGLE TRANSLATE │
│                   │   │                  │   │                  │
│ • churches table  │   │ Speech-to-text   │   │ Translation API  │
│ • services table  │   │ (transcription)  │   │                  │
│ • sessions table  │   │                  │   │                  │
│ • Row Level       │   │ WebSocket stream │   │ REST API         │
│   Security (RLS)  │   │                  │   │                  │
└───────────────────┘   └──────────────────┘   └──────────────────┘
```

---

**Happy translating! 🌍🎤💬**
