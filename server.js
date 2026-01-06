
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

// Initial Hydration
app.get('/api/initial-data', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories');
        const [menu] = await pool.query('SELECT * FROM menu_items');
        const [tables] = await pool.query('SELECT * FROM tables_pos');
        const [orders] = await pool.query('SELECT * FROM orders WHERE status != "Paid"');
        const [serviceRequests] = await pool.query('SELECT * FROM service_requests WHERE status = "Active"');
        
        // Fetch items for active orders
        for(let order of orders) {
            const [items] = await pool.query('SELECT * FROM order_items WHERE orderId = ?', [order.id]);
            order.items = items;
        }

        res.json({ categories, menu, tables, orders, serviceRequests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database fetch failed' });
    }
});

// Menu Management
app.post('/api/menu', async (req, res) => {
    const { categoryId, name, price, vegType, shortcut, inventoryCount } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO menu_items (categoryId, name, price, vegType, shortcut, inventoryCount) VALUES (?, ?, ?, ?, ?, ?)',
            [categoryId, name, price, vegType, shortcut, inventoryCount]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add menu item' });
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
    const { tableId, totalAmount, gstAmount, serviceTaxAmount, paymentMethod, discount } = req.body;
    try {
        await pool.query(
            'UPDATE orders SET status = "Paid", totalAmount = ?, gstAmount = ?, serviceTaxAmount = ?, paymentMethod = ?, discount = ? WHERE id = ?',
            [totalAmount, gstAmount, serviceTaxAmount, paymentMethod, discount, id]
        );
        if (tableId !== 0) {
            await pool.query(
                'UPDATE tables_pos SET status = "Available", currentOrderId = NULL WHERE id = ?',
                [tableId]
            );
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Settlement failed' });
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// All other routes serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`POS Production Server listening on port ${PORT}`);
});
