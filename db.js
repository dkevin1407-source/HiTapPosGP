
import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost', // Usually localhost on Hostinger for same-server DB
    user: 'u552823944_PosNodeJs',
    password: 'dctXbb5@1407',
    database: 'u552823944_POSNodeJs',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

export const pool = mysql.createPool(dbConfig);

export async function query(sql, params) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database Query Error:', error);
        throw error;
    }
}
