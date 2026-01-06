# Database Setup Guide for Hostinger

## Step 1: Access Your Database

1. Log in to your Hostinger control panel
2. Go to **Databases** → **MySQL Databases**
3. Find your database: `u552823944_POSNodeJs`
4. Click on **phpMyAdmin** to open the database management interface

## Step 2: Import the Schema

1. In phpMyAdmin, select your database (`u552823944_POSNodeJs`) from the left sidebar
2. Click on the **SQL** tab at the top
3. Open the `schema.sql` file from your project
4. Copy the entire contents of `schema.sql`
5. Paste it into the SQL query box in phpMyAdmin
6. Click **Go** or press **Ctrl+Enter** to execute

## Step 3: Verify Tables Were Created

After running the SQL, you should see these tables:
- `categories`
- `menu_items`
- `tables_pos`
- `orders`
- `order_items`
- `service_requests`

## Step 4: Verify Data

Check that default data was inserted:
- 7 categories
- 32 menu items
- 12 tables

## Troubleshooting

### If you get "Table already exists" errors:
- This is normal if you run the script multiple times
- The script uses `INSERT IGNORE` to prevent duplicate data

### If you get connection errors:
- Verify database credentials in `db.js`:
  - Database: `u552823944_POSNodeJs`
  - User: `u552823944_PosNodeJs`
  - Password: `dctXbb5@1407`
  - Host: `localhost`

### Test Database Connection:
Visit: `https://your-domain.com/api/test-db`
This will tell you if the database connection is working.

## Alternative: Using MySQL Command Line

If you have SSH access:

```bash
mysql -u u552823944_PosNodeJs -p u552823944_POSNodeJs < schema.sql
```

Enter password when prompted: `dctXbb5@1407`
