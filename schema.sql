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
INSERT INTO categories (name, color) VALUES
('Pizza', '#ef4444'),
('Beverages', '#3b82f6'),
('Sides', '#10b981'),
('Desserts', '#f59e0b')
ON DUPLICATE KEY UPDATE name=name;

-- Insert default menu items
INSERT INTO menu_items (categoryId, name, price, vegType, shortcut, inventoryCount, isAvailable) VALUES
(1, 'Margherita Pizza', 299.00, 'Veg', 'P1', 50, TRUE),
(1, 'Pepperoni Feast', 449.00, 'Non-veg', 'P2', 30, TRUE),
(2, 'Cold Coffee', 120.00, 'Veg', 'B1', 100, TRUE),
(2, 'Fresh Lime Soda', 80.00, 'Veg', 'B2', 80, TRUE),
(3, 'Garlic Breadstix', 149.00, 'Veg', 'S1', 40, TRUE),
(4, 'Choco Lava Cake', 99.00, 'Veg', 'D1', 25, TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- Insert default tables
INSERT INTO tables_pos (number, area, status, token) VALUES
('G1', 'Ground', 'Available', 't1'),
('G2', 'Ground', 'Available', 't2'),
('G3', 'Ground', 'Available', 't3'),
('G4', 'Ground', 'Available', 't4'),
('F1', 'First', 'Available', 't5'),
('F2', 'First', 'Available', 't6'),
('F3', 'First', 'Available', 't7'),
('F4', 'First', 'Available', 't8')
ON DUPLICATE KEY UPDATE number=number;
