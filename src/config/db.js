// backend/src/config/db.js
import 'dotenv/config';
import mysql from 'mysql2/promise';

// TiDB Cloud y Aiven exigen SSL. Se activa con DB_SSL=true.
const usarSSL = String(process.env.DB_SSL).toLowerCase() === 'true';

// En entornos serverless (Vercel) conviene 1; en un servidor persistente, 10.
const connectionLimit = Number(process.env.DB_POOL_LIMIT) || 10;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'red_ia_equidad',
  waitForConnections: true,
  connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4',
  ...(usarSSL
    ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
    : {}),
});

export default pool;