CREATE DATABASE IF NOT EXISTS builder_crm;
USE builder_crm;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'salesman') DEFAULT 'salesman',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_name VARCHAR(255),
    sender_email VARCHAR(191) NOT NULL,
    subject TEXT,
    body TEXT,
    status ENUM('New', 'Assigned', 'Not Interested', 'Follow-up', 'Deal Won') DEFAULT 'New',
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    salesman_id INT NOT NULL,
    followup_date DATE NOT NULL,
    remarks TEXT,
    status ENUM('Pending', 'Completed', 'Missed') DEFAULT 'Pending',
    completion_date TIMESTAMP NULL,
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    salesman_id INT NOT NULL,
    booking_date DATE NOT NULL,
    amount DECIMAL(15, 2),
    project VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert a default admin (password: admin123)
-- In a real app, you'd hash this. I'll provide a way to register or seed.
INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@example.com', '$2a$10$X8mY4.w8.mY4.w8.mY4.wO', 'admin');
