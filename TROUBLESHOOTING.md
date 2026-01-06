# Troubleshooting Guide

## Current Database Credentials (Updated)

- **Database Name**: `u552823944_u552823944_POS`
- **Database User**: `u552823944_u552823944_POS`
- **Password**: `dctXbb5@1407`
- **Host**: `localhost`

## Step-by-Step Fix for "Unknown Error"

### 1. Verify Database Tables Exist

Visit: `https://cornflowerblue-lapwing-659938.hostingersite.com/api/check-setup`

This will show you:
- Which tables exist
- Which tables are missing
- Database connection status

### 2. If Tables Don't Exist

1. Log into Hostinger Control Panel
2. Go to **Databases** → **phpMyAdmin**
3. Select database: `u552823944_u552823944_POS`
4. Click **SQL** tab
5. Copy entire contents of `schema.sql`
6. Paste and click **Go**

### 3. Test Database Connection

Visit: `https://cornflowerblue-lapwing-659938.hostingersite.com/api/test-db`

Expected response:
```json
{
  "status": "connected",
  "message": "Database connection successful"
}
```

### 3.5 Ensure API is reachable and environment variables are set

If the frontend receives HTML instead of JSON (error starts with `<!DOCTYPE html`), check:

- For Node.js apps: in hPanel -> Hosting -> Manage -> Node.js section, ensure the Node process is running and environment variable `VITE_API_BASE_URL` (if used) is set correctly. Restart the app after changing env vars.
- For deployments where Hostinger builds your frontend: in the Build & Deploy / Deployments section, add `VITE_API_BASE_URL` to the build environment variables so the built frontend targets the correct API at build time.

Quick checks:
- Run on the host or locally (set VITE_API_BASE_URL if needed):
  - `npm run check-api` (added to this repo) — runs a health check against `${VITE_API_BASE_URL || 'http://localhost:3000'}/api/health` and exits non-zero with a helpful message if it fails.
  - `curl -i https://your-site.com/api/health` — should return HTTP 200 and JSON `{ "status": "OK" }`.

### 4. Common Error Messages and Solutions

#### "Database tables not found"
- **Solution**: Run `schema.sql` in phpMyAdmin

#### "Database connection failed" or "ER_ACCESS_DENIED_ERROR"
- **Solution**: Verify credentials in `db.js` match your Hostinger database

#### "ER_BAD_DB_ERROR"
- **Solution**: Database name is incorrect. Check `db.js` file

#### "ECONNREFUSED"
- **Solution**: Database host might not be `localhost`. Check Hostinger docs for correct host.

### 5. Verify Server is Running

Check server logs in Hostinger control panel. You should see:
```
✅ Database connected successfully
POS Production Server listening on port 3000
```

### 6. Check Browser Console

Press F12 → Console tab to see detailed error messages.

## Quick Verification Checklist

- [ ] Database credentials updated in `db.js`
- [ ] `schema.sql` executed in phpMyAdmin
- [ ] All 6 tables exist (categories, menu_items, tables_pos, orders, order_items, service_requests)
- [ ] Server is running
- [ ] `/api/test-db` returns success
- [ ] `/api/check-setup` shows all tables exist

## Still Having Issues?

1. Check Hostinger error logs
2. Verify Node.js version (should be 18+)
3. Ensure all npm packages are installed
4. Check if port 3000 is accessible
5. Verify file permissions on server
