// backend/src/routes/upload.webp.js
//
// Ruta de subida que CONVIERTE cualquier imagen a WebP y la guarda en disco.
// Requiere: npm install multer sharp
//
// Cómo integrarlo en tu backend Express:
//   const uploadRouter = require('./routes/upload.webp');   // o import si usas ESM
//   app.use('/api/upload', uploadRouter);
//   app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
//
// Devuelve { success:true, data:{ url, filename } } como el resto de tu API.

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();

// Carpeta física donde se guardan las imágenes
const DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(DIR, { recursive: true });

// URL pública base (ajústala según tu .env, p.ej. https://api.tudominio.mx)
const PUBLIC_BASE = process.env.PUBLIC_URL || '';

// Recibimos el archivo en memoria para procesarlo con sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes.'));
  },
});

// El frontend envía el campo "archivo" (ver lib/api.js -> subirArchivo)
router.post('/', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ninguna imagen.' });
    }

    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const destino = path.join(DIR, nombre);

    // Conversión a WebP (redimensiona si excede 2000px de ancho, conservando proporción)
    await sharp(req.file.buffer)
      .rotate() // respeta orientación EXIF
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(destino);

    const url = `${PUBLIC_BASE}/uploads/${nombre}`;
    return res.json({ success: true, data: { url, filename: nombre } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'No se pudo procesar la imagen.' });
  }
});

module.exports = router;
