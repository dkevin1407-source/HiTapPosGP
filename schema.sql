-- HiTap POS Database Schema
-- MySQL Database for POS System

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoryId INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    vegType ENUM('Veg', 'Non-veg', 'Egg') NOT NULL DEFAULT 'Veg',
    shortcut VARCHAR(10),
    inventoryCount INT NOT NULL DEFAULT 0,
    isAvailable BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category (categoryId),
    INDEX idx_available (isAvailable)
);

-- Tables Table
CREATE TABLE IF NOT EXISTS tables_pos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number VARCHAR(20) NOT NULL UNIQUE,
    area VARCHAR(50) NOT NULL,
    status ENUM('Available', 'Occupied', 'Billed') NOT NULL DEFAULT 'Available',
    token VARCHAR(50),
    currentOrderId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_area (area)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tableId INT NOT NULL,
    status ENUM('Pending', 'Kitchen', 'Served', 'Paid') NOT NULL DEFAULT 'Pending',
    totalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gstAmount DECIMAL(10, 2) DEFAULT 0,
    serviceTaxAmount DECIMAL(10, 2) DEFAULT 0,
    paymentMethod VARCHAR(20),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_table (tableId),
    INDEX idx_status (status),
    INDEX idx_created (createdAt)
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    menuItemId INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    instructions TEXT,
    isOpenItem BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menuItemId) REFERENCES menu_items(id),
    INDEX idx_order (orderId)
);

-- Service Requests Table
CREATE TABLE IF NOT EXISTS service_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tableId INT NOT NULL,
    tableNumber VARCHAR(20) NOT NULL,
    type ENUM('Call Waiter', 'Water', 'Bill') NOT NULL,
    status ENUM('Active', 'Resolved') NOT NULL DEFAULT 'Active',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_table (tableId)
);

-- Insert default categories
INSERT IGNORE INTO categories (id, name, color) VALUES
(1, 'Pizza', '#ef4444'),
(2, 'Beverages', '#3b82f6'),
(3, 'Sides', '#10b981'),
(4, 'Desserts', '#f59e0b'),
(5, 'Main Course', '#8b5cf6'),
(6, 'Appetizers', '#ec4899'),
(7, 'Salads', '#14b8a6');

-- Insert default menu items
INSERT IGNORE INTO menu_items (id, categoryId, name, price, vegType, shortcut, inventoryCount, isAvailable) VALUES
-- Pizza Category
(1, 1, 'Margherita Pizza', 299.00, 'Veg', 'P1', 50, TRUE),
(2, 1, 'Pepperoni Feast', 449.00, 'Non-veg', 'P2', 30, TRUE),
(3, 1, 'Farmhouse Pizza', 399.00, 'Veg', 'P3', 35, TRUE),
(4, 1, 'Chicken Supreme', 499.00, 'Non-veg', 'P4', 25, TRUE),
(5, 1, 'Veggie Delight', 349.00, 'Veg', 'P5', 40, TRUE),
-- Beverages Category
(6, 2, 'Cold Coffee', 120.00, 'Veg', 'B1', 100, TRUE),
(7, 2, 'Fresh Lime Soda', 80.00, 'Veg', 'B2', 80, TRUE),
(8, 2, 'Mango Shake', 150.00, 'Veg', 'B3', 60, TRUE),
(9, 2, 'Coca Cola', 60.00, 'Veg', 'B4', 200, TRUE),
(10, 2, 'Orange Juice', 90.00, 'Veg', 'B5', 70, TRUE),
(11, 2, 'Iced Tea', 70.00, 'Veg', 'B6', 90, TRUE),
-- Sides Category
(12, 3, 'Garlic Breadstix', 149.00, 'Veg', 'S1', 40, TRUE),
(13, 3, 'French Fries', 99.00, 'Veg', 'S2', 60, TRUE),
(14, 3, 'Onion Rings', 129.00, 'Veg', 'S3', 45, TRUE),
(15, 3, 'Chicken Wings', 199.00, 'Non-veg', 'S4', 30, TRUE),
(16, 3, 'Mozzarella Sticks', 179.00, 'Veg', 'S5', 35, TRUE),
-- Desserts Category
(17, 4, 'Choco Lava Cake', 99.00, 'Veg', 'D1', 25, TRUE),
(18, 4, 'Ice Cream Sundae', 149.00, 'Veg', 'D2', 40, TRUE),
(19, 4, 'Brownie with Ice Cream', 179.00, 'Veg', 'D3', 30, TRUE),
(20, 4, 'Tiramisu', 199.00, 'Veg', 'D4', 20, TRUE),
-- Main Course Category
(21, 5, 'Butter Chicken', 349.00, 'Non-veg', 'M1', 25, TRUE),
(22, 5, 'Paneer Tikka', 299.00, 'Veg', 'M2', 30, TRUE),
(23, 5, 'Chicken Biryani', 399.00, 'Non-veg', 'M3', 20, TRUE),
(24, 5, 'Veg Biryani', 279.00, 'Veg', 'M4', 35, TRUE),
(25, 5, 'Grilled Chicken', 449.00, 'Non-veg', 'M5', 15, TRUE),
-- Appetizers Category
(26, 6, 'Spring Rolls', 149.00, 'Veg', 'A1', 40, TRUE),
(27, 6, 'Chicken Tenders', 199.00, 'Non-veg', 'A2', 30, TRUE),
(28, 6, 'Bruschetta', 179.00, 'Veg', 'A3', 25, TRUE),
(29, 6, 'Chicken Satay', 229.00, 'Non-veg', 'A4', 20, TRUE),
-- Salads Category
(30, 7, 'Caesar Salad', 199.00, 'Veg', 'SA1', 35, TRUE),
(31, 7, 'Greek Salad', 179.00, 'Veg', 'SA2', 40, TRUE),
(32, 7, 'Chicken Salad', 249.00, 'Non-veg', 'SA3', 25, TRUE);

-- Insert default tables
INSERT IGNORE INTO tables_pos (id, number, area, status, token) VALUES
(1, 'G1', 'Ground', 'Available', 't1'),
(2, 'G2', 'Ground', 'Available', 't2'),
(3, 'G3', 'Ground', 'Available', 't3'),
(4, 'G4', 'Ground', 'Available', 't4'),
(5, 'G5', 'Ground', 'Available', 't5'),
(6, 'G6', 'Ground', 'Available', 't6'),
(7, 'F1', 'First', 'Available', 't7'),
(8, 'F2', 'First', 'Available', 't8'),
(9, 'F3', 'First', 'Available', 't9'),
(10, 'F4', 'First', 'Available', 't10'),
(11, 'T1', 'Terrace', 'Available', 't11'),
(12, 'T2', 'Terrace', 'Available', 't12');

-- Insert sample orders for testing (optional - can be removed if you want fresh start)
-- Note: These will only insert if tables don't have existing orders
INSERT IGNORE INTO orders (id, tableId, status, totalAmount, discount, gstAmount, serviceTaxAmount, paymentMethod, createdAt) VALUES
(1, 1, 'Paid', 598.00, 0, 29.90, 0, 'Cash', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 2, 'Paid', 848.00, 50.00, 39.90, 0, 'Card', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(3, 3, 'Kitchen', 449.00, 0, 0, 0, NULL, NOW());

-- Insert sample order items
INSERT IGNORE INTO order_items (id, orderId, menuItemId, name, quantity, price) VALUES
(1, 1, 1, 'Margherita Pizza', 2, 299.00),
(2, 2, 2, 'Pepperoni Feast', 1, 449.00),
(3, 2, 6, 'Cold Coffee', 2, 120.00),
(4, 2, 12, 'Garlic Breadstix', 1, 149.00),
(5, 3, 3, 'Farmhouse Pizza', 1, 399.00),
(6, 3, 7, 'Fresh Lime Soda', 1, 80.00);
