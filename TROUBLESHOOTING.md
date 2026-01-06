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
