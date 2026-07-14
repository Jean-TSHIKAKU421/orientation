const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'udbl_academia',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ Connecté à MySQL - udbl_academia');
        conn.release();
    } catch (err) {
        console.error('❌ Erreur MySQL:', err.message);
    }
}

module.exports = { pool, testConnection };