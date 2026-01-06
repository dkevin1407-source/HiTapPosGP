
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serving static files
app.use(express.static(path.join(__dirname, 'dist')));

// --- API ROUTES ---

// Database connection test
app.get('/api/test-db', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT 1 as test');
        res.json({ 
            status: 'connected', 
            message: 'Database connection successful',
            test: result 
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ 
            error: 'Database connection failed', 
            details: error.message,
            code: error.code 
        });
    }
});

// Initial Hydration
app.get('/api/initial-data', async (req, res) => {
    try {
        // Test connection first
        await pool.query('SELECT 1');
        
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY id');
        const [menu] = await pool.query('SELECT * FROM menu_items ORDER BY id');
        const [tables] = await pool.query('SELECT * FROM tables_pos ORDER BY id');
        const [orders] = await pool.query('SELECT * FROM orders WHERE status != "Paid" ORDER BY id');
        const [serviceRequests] = await pool.query('SELECT * FROM service_requests WHERE status = "Active" ORDER BY id');
        
        // Fetch items for active orders
        for(let order of orders) {
            const [items] = await pool.query('SELECT * FROM order_items WHERE orderId = ? ORDER BY id', [order.id]);
            order.items = items;
        }

        res.json({ 
            categories: categories || [], 
            menu: menu || [], 
            tables: tables || [], 
            orders: orders || [], 
            serviceRequests: serviceRequests || [] 
        });
    } catch (error) {
        console.error('Error fetching initial data:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Check if it's a table doesn't exist error
        if (error.code === 'ER_NO_SUCH_TABLE') {
            res.status(500).json({ 
                error: 'Database tables not found', 
                details: 'Please run the schema.sql file to create the required tables.',
                message: error.message,
                code: error.code
            });
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ER_BAD_DB_ERROR') {
            res.status(500).json({ 
                error: 'Database connection failed', 
                details: `Unable to connect to the database. Error: ${error.message}. Please check your database credentials in db.js`,
                message: error.message,
                code: error.code
            });
        } else {
            res.status(500).json({ 
                error: 'Database fetch failed', 
                details: error.message || 'Unknown database error',
                message: error.message || 'Unknown error',
                code: error.code || 'UNKNOWN'
            });
        }
    }
});

// Menu Management
app.post('/api/menu', async (req, res) => {
    const { categoryId, name, price, vegType, shortcut, inventoryCount } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO menu_items (categoryId, name, price, vegType, shortcut, inventoryCount) VALUES (?, ?, ?, ?, ?, ?)',
            [categoryId, name, price, vegType, shortcut || null, inventoryCount || 0]
        );
        res.json({ id: result.insertId, categoryId, name, price, vegType, shortcut, inventoryCount, isAvailable: true });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ error: 'Failed to add menu item', details: error.message });
    }
});

app.put('/api/menu/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, inventoryCount, isAvailable } = req.body;
    try {
        await pool.query(
            'UPDATE menu_items SET name = ?, price = ?, inventoryCount = ?, isAvailable = ? WHERE id = ?',
            [name, price, inventoryCount, isAvailable, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/menu/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM menu_items WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Order Management
app.post('/api/orders', async (req, res) => {
    const { tableId, items, totalAmount } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create Order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (tableId, totalAmount, status) VALUES (?, ?, "Kitchen")',
            [tableId, totalAmount]
        );
        const orderId = orderResult.insertId;

        // 2. Insert Items & Update Inventory
        for (const item of items) {
            await connection.query(
                'INSERT INTO order_items (orderId, menuItemId, name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.menuItemId, item.name, item.quantity, item.price]
            );
            await connection.query(
                'UPDATE menu_items SET inventoryCount = inventoryCount - ? WHERE id = ?',
                [item.quantity, item.menuItemId]
            );
        }

        // 3. Update Table Status if not Takeaway
        if (tableId !== 0) {
            await connection.query(
                'UPDATE tables_pos SET status = "Occupied", currentOrderId = ? WHERE id = ?',
                [orderId, tableId]
            );
        }

        await connection.commit();
        res.json({ orderId });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Order processing failed' });
    } finally {
        connection.release();
    }
});

app.put('/api/orders/:id/settle', async (req, res) => {
    const { id } = req.params;
    const { tableId, totalAmount, gstAmount, serviceTaxAmount, paymentMethod, discount, settleAllTableOrders } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Settle the primary order
        await connection.query(
            'UPDATE orders SET status = "Paid", totalAmount = ?, gstAmount = ?, serviceTaxAmount = ?, paymentMethod = ?, discount = ? WHERE id = ?',
            [totalAmount, gstAmount, serviceTaxAmount, paymentMethod, discount, id]
        );
        
        // If requested, mark all other unpaid orders for this table as paid
        if (settleAllTableOrders && tableId !== 0) {
            await connection.query(
                'UPDATE orders SET status = "Paid", paymentMethod = ? WHERE tableId = ? AND status != "Paid" AND id != ?',
                [paymentMethod, tableId, id]
            );
        }
        
        // Free table if all orders are paid
        if (tableId !== 0) {
            const [unpaidOrders] = await connection.query(
                'SELECT COUNT(*) as count FROM orders WHERE tableId = ? AND status != "Paid"',
                [tableId]
            );
            
            if (unpaidOrders[0].count === 0) {
                await connection.query(
                    'UPDATE tables_pos SET status = "Available", currentOrderId = NULL WHERE id = ?',
                    [tableId]
                );
            }
        }
        
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Settlement failed' });
    } finally {
        connection.release();
    }
});

// Service Requests
app.post('/api/service-requests', async (req, res) => {
    const { tableId, tableNumber, type } = req.body;
    try {
        await pool.query(
            'INSERT INTO service_requests (tableId, tableNumber, type) VALUES (?, ?, ?)',
            [tableId, tableNumber, type]
        );
        if (type === 'Bill' && tableId !== 0) {
            await pool.query('UPDATE tables_pos SET status = "Billed" WHERE id = ?', [tableId]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Service request failed' });
    }
});

app.delete('/api/service-requests/:id', async (req, res) => {
    try {
        await pool.query('UPDATE service_requests SET status = "Resolved" WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Resolution failed' });
    }
});

// Categories Management
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY id');
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    const { name, color } = req.body;
    try {
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }
        const [result] = await pool.query(
            'INSERT INTO categories (name, color) VALUES (?, ?)',
            [name.trim(), color || '#3b82f6']
        );
        res.json({ id: result.insertId, name: name.trim(), color: color || '#3b82f6' });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ error: 'Failed to add category', details: error.message });
    }
});

// Tables Management
app.get('/api/tables', async (req, res) => {
    try {
        const [tables] = await pool.query('SELECT * FROM tables_pos ORDER BY area, number');
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

app.post('/api/tables', async (req, res) => {
    const { number, area, status, token } = req.body;
    try {
        if (!number || !number.trim()) {
            return res.status(400).json({ error: 'Table number is required' });
        }
        if (!area || !area.trim()) {
            return res.status(400).json({ error: 'Table area is required' });
        }
        const [result] = await pool.query(
            'INSERT INTO tables_pos (number, area, status, token) VALUES (?, ?, ?, ?)',
            [number.trim(), area.trim(), status || 'Available', token || `token-${Date.now()}`]
        );
        res.json({ 
            id: result.insertId, 
            number: number.trim(), 
            area: area.trim(), 
            status: status || 'Available', 
            token: token || `token-${Date.now()}` 
        });
    } catch (error) {
        console.error('Error adding table:', error);
        res.status(500).json({ error: 'Failed to add table', details: error.message });
    }
});

app.put('/api/tables/:id', async (req, res) => {
    const { id } = req.params;
    const { area, status, currentOrderId } = req.body;
    try {
        const updates = [];
        const values = [];
        if (area !== undefined) {
            updates.push('area = ?');
            values.push(area);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        if (currentOrderId !== undefined) {
            updates.push('currentOrderId = ?');
            values.push(currentOrderId);
        }
        if (updates.length > 0) {
            values.push(id);
            await pool.query(
                `UPDATE tables_pos SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

app.put('/api/tables/area/update', async (req, res) => {
    const { oldArea, newArea } = req.body;
    try {
        await pool.query(
            'UPDATE tables_pos SET area = ? WHERE area = ?',
            [newArea, oldArea]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Area update failed' });
    }
});

app.delete('/api/tables/area/:area', async (req, res) => {
    const { area } = req.params;
    try {
        await pool.query('DELETE FROM tables_pos WHERE area = ?', [area]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Area deletion failed' });
    }
});

app.delete('/api/tables/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tables_pos WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Order Cancellation
app.delete('/api/orders/:id/item/:itemId', async (req, res) => {
    const { id, itemId } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get item details
        const [items] = await connection.query(
            'SELECT * FROM order_items WHERE id = ? AND orderId = ?',
            [itemId, id]
        );
        
        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Item not found' });
        }
        
        const item = items[0];
        
        // Return inventory
        await connection.query(
            'UPDATE menu_items SET inventoryCount = inventoryCount + ? WHERE id = ?',
            [item.quantity, item.menuItemId]
        );
        
        // Delete item
        await connection.query('DELETE FROM order_items WHERE id = ?', [itemId]);
        
        // Check if order has remaining items
        const [remainingItems] = await connection.query(
            'SELECT COUNT(*) as count FROM order_items WHERE orderId = ?',
            [id]
        );
        
        if (remainingItems[0].count === 0) {
            // Cancel entire order
            await connection.query('DELETE FROM orders WHERE id = ?', [id]);
            await connection.query(
                'UPDATE tables_pos SET status = "Available", currentOrderId = NULL WHERE currentOrderId = ?',
                [id]
            );
        } else {
            // Update order total
            const [orderItems] = await connection.query(
                'SELECT SUM(price * quantity) as total FROM order_items WHERE orderId = ?',
                [id]
            );
            await connection.query(
                'UPDATE orders SET totalAmount = ? WHERE id = ?',
                [orderItems[0].total || 0, id]
            );
        }
        
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Cancellation failed' });
    } finally {
        connection.release();
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get order details
        const [orders] = await connection.query('SELECT * FROM orders WHERE id = ?', [id]);
        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const order = orders[0];
        
        // Get order items and return inventory
        const [items] = await connection.query(
            'SELECT * FROM order_items WHERE orderId = ?',
            [id]
        );
        
        for (const item of items) {
            await connection.query(
                'UPDATE menu_items SET inventoryCount = inventoryCount + ? WHERE id = ?',
                [item.quantity, item.menuItemId]
            );
        }
        
        // Free table if needed
        if (order.tableId !== 0) {
            const [tableOrders] = await connection.query(
                'SELECT COUNT(*) as count FROM orders WHERE tableId = ? AND status != "Paid" AND id != ?',
                [order.tableId, id]
            );
            
            if (tableOrders[0].count === 0) {
                await connection.query(
                    'UPDATE tables_pos SET status = "Available", currentOrderId = NULL WHERE id = ?',
                    [order.tableId]
                );
            } else {
                // Set currentOrderId to the next newest order
                const [nextOrder] = await connection.query(
                    'SELECT id FROM orders WHERE tableId = ? AND status != "Paid" AND id != ? ORDER BY id DESC LIMIT 1',
                    [order.tableId, id]
                );
                if (nextOrder.length > 0) {
                    await connection.query(
                        'UPDATE tables_pos SET currentOrderId = ? WHERE id = ?',
                        [nextOrder[0].id, order.tableId]
                    );
                }
            }
        }
        
        // Delete order and items
        await connection.query('DELETE FROM order_items WHERE orderId = ?', [id]);
        await connection.query('DELETE FROM orders WHERE id = ?', [id]);
        
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Order cancellation failed' });
    } finally {
        connection.release();
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database setup check endpoint
app.get('/api/check-setup', async (req, res) => {
    try {
        const tables = ['categories', 'menu_items', 'tables_pos', 'orders', 'order_items', 'service_requests'];
        const results = {};
        
        for (const table of tables) {
            try {
                const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                results[table] = { exists: true, count: rows[0].count };
            } catch (error) {
                if (error.code === 'ER_NO_SUCH_TABLE') {
                    results[table] = { exists: false, error: 'Table does not exist' };
                } else {
                    results[table] = { exists: false, error: error.message };
                }
            }
        }
        
        const allExist = Object.values(results).every((r) => r.exists);
        
        res.json({
            database: 'connected',
            tables: results,
            setupComplete: allExist,
            message: allExist 
                ? 'All tables exist. Setup is complete!' 
                : 'Some tables are missing. Please run schema.sql to create them.'
        });
    } catch (error) {
        res.status(500).json({
            database: 'connection failed',
            error: error.message,
            code: error.code,
            message: 'Unable to connect to database. Please check your database credentials.'
        });
    }
});

// All other routes serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`POS Production Server listening on port ${PORT}`);
});
