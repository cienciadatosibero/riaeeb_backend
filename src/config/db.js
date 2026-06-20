// backend/src/config/db.js
import 'dotenv/config';
import mysql from 'mysql2/promise';

// Aiven exige SSL. Se activa con DB_SSL=true (ponlo en Vercel).
const usarSSL = String(process.env.DB_SSL).toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'red_ia_equidad',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ...(usarSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

export default pool;
