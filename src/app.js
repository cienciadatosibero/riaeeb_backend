import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { UPLOADS_DIR } from './config/upload.js';
import pool from './config/db.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();

const PERMITIDOS = (process.env.CORS_ORIGIN || '')
  .split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const limpio = origin.replace(/\/+$/, '');
    if (PERMITIDOS.length === 0 || PERMITIDOS.includes(limpio)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT DATABASE() AS db, 1 AS ok');
    return res.json({
      success: true,
      data: {
        status: 'ok',
        version: 'v6-schema-aware-public',
        service: 'red-ia-equidad-api',
        database: row?.db || null,
      },
    });
  } catch (err) {
    console.error('[DB HEALTH ERROR]', err?.code, err?.message);
    return res.status(500).json({
      success: false,
      message: 'El backend está activo, pero no puede consultar la base de datos.',
      code: err?.code || 'DB_CONNECTION_ERROR',
    });
  }
});

// Diagnóstico temporal y seguro: no expone credenciales ni datos, solo indica
// qué tablas existen en la BD a la que está conectado Vercel.
app.get('/api/db-status', async (req, res) => {
  try {
    const names = ['investigadores','investigaciones','publicaciones_red','about','usuarios','areas_conocimiento','tipos_investigacion','investigacion_participantes'];
    const [rows] = await pool.query(
      `SELECT TABLE_NAME AS nombre
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN (${names.map(()=>'?').join(',')})`,
      names
    );
    const found = new Set(rows.map((r)=>r.nombre));
    res.json({ success:true, data:Object.fromEntries(names.map((n)=>[n,found.has(n)])) });
  } catch (err) { errorHandler(err,req,res,()=>{}); }
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
