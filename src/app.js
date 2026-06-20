// backend/src/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { UPLOADS_DIR } from './config/upload.js';
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

// version: te dice qué build está corriendo realmente
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', version: 'v4', service: 'red-ia-equidad-api' } });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
