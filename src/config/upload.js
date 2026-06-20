// backend/src/config/upload.js  (v4 — sin mkdir al importar; no truena en Vercel)
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// En Vercel el único directorio escribible es /tmp; en local, ../../uploads
export const UPLOADS_DIR = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '../../uploads');

// IMPORTANTE: NO se crea la carpeta al importar el módulo (eso tumbaba la función
// en Vercel). Se crea de forma perezosa solo cuando realmente se sube un archivo.
const storage = multer.diskStorage({
  destination(req, file, cb) {
    try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch { /* solo lectura: se ignora */ }
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = /image\/(png|jpe?g|webp|svg\+xml|gif)/.test(file.mimetype);
  cb(ok ? null : new Error('Solo se permiten imágenes (png, jpg, webp, svg, gif).'), ok);
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
