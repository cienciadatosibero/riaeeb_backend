// backend/src/config/upload.js
// v7 - almacenamiento temporal eliminado.
// Los archivos se reciben en memoria y el controlador los guarda en TiDB.
// Esto evita perder imágenes entre ejecuciones serverless de Vercel.

import multer from 'multer';

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype || '');
  cb(
    ok ? null : new Error('Solo se permiten imágenes PNG, JPG, JPEG, WebP o GIF.'),
    ok
  );
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Se mantiene exportado para no romper imports antiguos.
// Ya no se usa para guardar archivos en Vercel.
export const UPLOADS_DIR = '/tmp/uploads';
