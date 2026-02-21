const mysql = require('mysql2/promise');
require('dotenv').config();

const queries = [
    "DROP DATABASE IF EXISTS builder_crm",
    "CREATE DATABASE builder_crm",
    "USE builder_crm",
    `CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(191) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'salesman') DEFAULT 'salesman',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_name VARCHAR(255),
        sender_email VARCHAR(191) NOT NULL,
        subject TEXT,
        body TEXT,
        status ENUM('New', 'Assigned', 'Not Interested', 'Follow-up', 'Deal Won') DEFAULT 'New',
        assigned_to INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE followups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        followup_date DATE NOT NULL,
        remarks TEXT,
        status ENUM('Pending', 'Completed') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        salesman_id INT NOT NULL,
        booking_date DATE NOT NULL,
        amount DECIMAL(15, 2),
        project VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE CASCADE
    )`
];

async function setup() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        console.log('Connected.');
        for (const q of queries) {
            await connection.query(q);
            console.log('Success:', q.substring(0, 30));
        }

        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('admin123', 10);
        await connection.query("INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@example.com', ?, 'admin')", [hash]);
        console.log('Admin user created.');

    } catch (e) {
        console.error('Setup failed:', e.message);
    } finally {
        if (connection) await connection.end();
    }
}
setup();
