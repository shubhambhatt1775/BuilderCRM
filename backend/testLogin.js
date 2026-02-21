const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function testLogin() {
    const email = 'admin@example.com';
    const password = 'admin123';
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            console.log('User not found');
            return;
        }

        const user = rows[0];
        console.log('User found:', user.email);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
    } catch (err) {
        console.error('Login error:', err);
    } finally {
        await pool.end();
    }
}

testLogin();
