const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function fix() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
    });

    try {
        console.log('Checking availability table...');
        const [columns] = await pool.query('DESCRIBE availability');
        const hasWorkingHours = columns.some(c => c.Field === 'working_hours');
        const hasBlockedDates = columns.some(c => c.Field === 'blocked_dates');
        const hasInterval = columns.some(c => c.Field === 'interval_minutes');

        if (!hasWorkingHours) {
            console.log('Adding working_hours column to availability...');
            await pool.query('ALTER TABLE availability ADD COLUMN working_hours JSON AFTER user_id');
        } else {
            console.log('working_hours already exists in availability.');
        }

        if (!hasBlockedDates) {
            console.log('Adding blocked_dates column to availability...');
            await pool.query('ALTER TABLE availability ADD COLUMN blocked_dates JSON AFTER working_hours');
        }

        if (!hasInterval) {
            console.log('Adding interval_minutes column to availability...');
            await pool.query('ALTER TABLE availability ADD COLUMN interval_minutes INT DEFAULT 30 AFTER blocked_dates');
        }

        console.log('Done!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

fix();
