# Control Panel Migration Guide

## Overview

The OpenWord control panel has been migrated from a server-side HTML page to a modern Next.js React application with full multi-tenant support.

## What Changed

### Old Control Panel (Deprecated)
- **Location:** `views/control.html` + `public/js/control.js`
- **Access:** `https://your-server.onrender.com/control`
- **Limitations:**
  - No multi-tenant support
  - Uses public `/church/configuration` endpoint (no authentication)
  - QR codes don't include church key parameter
  - Single church configuration only
  - Limited customization options

### New Control Panel (Current)
- **Location:** `OpenWordClient/pages/control.js` (Next.js React app)
- **Access:** `https://your-client.vercel.app/control`
- **Features:**
  - ✅ Full multi-tenant support
  - ✅ Authenticated `/api/church/profile` endpoint
  - ✅ Fetches church-specific data from Supabase
  - ✅ QR codes include church key and service ID
  - ✅ Church-specific branding and configuration
  - ✅ Better error handling and user feedback
  - ✅ Modern React interface with real-time updates

## Migration Steps

### For Users

1. **Bookmark the new URL:**
   ```
   https://open-word-client.vercel.app/control
   ```

2. **Login with your Supabase credentials**

3. **Verify your church profile exists:**
   - If you see "Church Profile Setup Required", contact your administrator
   - Your administrator needs to create a church profile in Supabase

### For Administrators

1. **Update bookmarks and documentation:**
   - Replace all references to `render.com/control` with `vercel.app/control`

2. **Ensure church profiles are created:**
   - Every user needs a church profile in Supabase
   - See `TROUBLESHOOTING-CHURCH-KEY-ERROR.md` for setup instructions

3. **Set environment variable on Render:**
   ```
   DEBABEL_CLIENT_APP=https://your-client.vercel.app
   ```
   This enables automatic redirect from old URL to new URL.

## Automatic Redirect

The server now automatically redirects `/control` requests to the new Next.js control panel:

```
https://your-server.onrender.com/control
   ↓ (redirects to)
https://your-client.vercel.app/control
```

**Requirements:**
- `DEBABEL_CLIENT_APP` environment variable must be set on Render
- If not set, users will see a deprecation warning on the old control panel

## Troubleshooting

### "Church key is required" Error

This error appears when using the **old control panel**. Solutions:

1. **Access the new control panel:**
   - Go to `https://your-client.vercel.app/control`
   - Login with your Supabase credentials

2. **If you're already on the new panel and see this error:**
   - You don't have a church profile in Supabase
   - See `TROUBLESHOOTING-CHURCH-KEY-ERROR.md` for detailed steps
   - Run the diagnostic SQL: `debug-church-profile.sql`

### QR Code Shows Wrong URL

This happens on the old control panel because it doesn't include the church key parameter.

**Solution:** Use the new control panel at `vercel.app/control`

### Can't Access Control Panel

1. **Check you're using the correct URL:**
   - ✅ `https://your-client.vercel.app/control` (NEW)
   - ❌ `https://your-server.onrender.com/control` (OLD - will redirect)

2. **Verify you have a Supabase account:**
   - Created through the registration process
   - Associated with a church profile

3. **Check Render environment variables:**
   - `DEBABEL_CLIENT_APP` must be set for redirect to work

## Timeline

- **Before 2025-10-16:** Old server-side control panel in use
- **2025-10-16:** Multi-tenant support added, new Next.js control panel created
- **Current:** Old control panel deprecated, automatic redirect enabled
- **Future:** Old control panel will be removed in a future release

## Support

If you encounter issues:

1. Check Render logs for error messages
2. Check browser console (F12) for JavaScript errors
3. Run diagnostic SQL: `debug-church-profile.sql`
4. See `TROUBLESHOOTING-CHURCH-KEY-ERROR.md` for detailed troubleshooting

## Developer Notes

### Keeping Old Control Panel (Not Recommended)

If you need to temporarily keep the old control panel:

1. Comment out the redirect in `src/server.js`:
   ```javascript
   app.get('/control', (req, res) => {
     // res.redirect(...);  // Comment this out
     res.sendFile(join(__dirname, '..', 'views', 'control.html'));
   });
   ```

2. **Note:** The old control panel does NOT support multi-tenant features!

### Removing Old Control Panel (Future)

In a future release, these files will be removed:
- `views/control.html`
- `public/js/control.js`
- `public/css/client.css` (if not used elsewhere)

The `/control` route will be removed entirely from the server, as the control panel now lives exclusively in the client app.
