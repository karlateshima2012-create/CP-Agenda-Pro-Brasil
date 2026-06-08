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
        console.log('Checking profiles table...');
        const [columns] = await pool.query('DESCRIBE profiles');
        const hasSlug = columns.some(c => c.Field === 'slug');
        const hasWorkingHours = columns.some(c => c.Field === 'working_hours');
        const hasBlockedDates = columns.some(c => c.Field === 'blocked_dates');

        if (!hasSlug) {
            console.log('Adding slug column to profiles...');
            await pool.query('ALTER TABLE profiles ADD COLUMN slug VARCHAR(255) UNIQUE AFTER id');
        } else {
            console.log('Slug column already exists.');
        }

        if (!hasWorkingHours) {
            console.log('Adding working_hours column to profiles...');
            await pool.query('ALTER TABLE profiles ADD COLUMN working_hours JSON AFTER email');
        }

        if (!hasBlockedDates) {
            console.log('Adding blocked_dates column to profiles...');
            await pool.query('ALTER TABLE profiles ADD COLUMN blocked_dates JSON AFTER working_hours');
        }

        console.log('Creating/Updating public_profiles view...');
        await pool.query(`
            CREATE OR REPLACE VIEW public_profiles AS
            SELECT 
                id,
                slug,
                company_name,
                owner_name,
                profile_image,
                cover_image,
                primary_color,
                secondary_color,
                short_description,
                services_title,
                services_subtitle,
                account_status,
                plan_type,
                plan_expires_at,
                lifetime_appointments,
                created_at,
                updated_at,
                deleted_at
            FROM profiles
            WHERE (account_status != 'deleted' OR account_status IS NULL)
              AND (deleted_at IS NULL)
        `);

        console.log('Done!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

fix();
