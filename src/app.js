// backend/src/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { UPLOADS_DIR } from './config/upload.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();

// Orígenes de producción que SIEMPRE deben poder consumir la API.
// Se agregan además los definidos en CORS_ORIGIN de Vercel.
const ORIGENES_FIJOS = new Set([
  'https://riaaeb.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]);

const ORIGENES_ENV = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

for (const origen of ORIGENES_ENV) ORIGENES_FIJOS.add(origen);

function origenPermitido(origin) {
  if (!origin) return true;

  const limpio = String(origin).trim().replace(/\/+$/, '');

  if (ORIGENES_FIJOS.has(limpio)) return true;

  // Permite previews del MISMO proyecto frontend en Vercel:
  // riaaeb-git-...vercel.app, riaaeb-xxxxx.vercel.app, etc.
  if (/^https:\/\/riaaeb(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(limpio)) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin(origin, cb) {
    if (origenPermitido(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// CORS debe ejecutarse ANTES de cualquier ruta.
app.use(cors(corsOptions));

// Responder explícitamente los preflight antes de tocar auth, BD o rutas.
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compatibilidad con imágenes antiguas.
if (UPLOADS_DIR) {
  app.use('/uploads', express.static(UPLOADS_DIR));
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: 'v8-cors-login-fix',
      service: 'red-ia-equidad-api',
    },
  });
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
