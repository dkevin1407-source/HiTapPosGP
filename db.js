
import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost', // Hostinger uses localhost for same-server databases
    user: 'u552823944_u552823944_POS',
    password: 'dctXbb5@1407',
    database: 'u552823944_u552823944_POS',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00', // UTC timezone
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

export const pool = mysql.createPool(dbConfig);

// Test connection on startup
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(error => {
        console.error('❌ Database connection failed:', error.message);
        console.error('Error code:', error.code);
    });

export async function query(sql, params) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database Query Error:', error);
        throw error;
    }
}
