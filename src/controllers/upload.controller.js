// backend/src/controllers/upload.controller.js
import { randomUUID } from 'crypto';
import pool from '../config/db.js';

let tablaLista = false;

async function asegurarTabla() {
  if (tablaLista) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS archivos_imagenes (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      nombre_original VARCHAR(255) NULL,
      mime VARCHAR(100) NOT NULL,
      datos MEDIUMBLOB NOT NULL,
      tamano INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  tablaLista = true;
}

function basePublica(req) {
  const configurada = String(
    process.env.PUBLIC_URL ||
    process.env.API_PUBLIC_URL ||
    ''
  ).trim().replace(/\/+$/, '');

  if (configurada) return configurada;

  const forwarded = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();

  const protocolo = forwarded || req.protocol || 'https';
  return `${protocolo}://${req.get('host')}`;
}

export async function subir(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ninguna imagen.'
      });
    }

    await asegurarTabla();

    const id = randomUUID();
    const nombre = String(req.file.originalname || 'imagen').slice(0, 255);
    const mime = String(req.file.mimetype || 'image/webp').slice(0, 100);

    await pool.query(
      `INSERT INTO archivos_imagenes
       (id, nombre_original, mime, datos, tamano)
       VALUES (?, ?, ?, ?, ?)`,
      [id, nombre, mime, req.file.buffer, req.file.size || req.file.buffer.length]
    );

    const url = `${basePublica(req)}/api/upload/archivo/${id}`;

    return res.status(201).json({
      success: true,
      data: {
        id,
        url,
        filename: id
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function verArchivo(req, res, next) {
  try {
    await asegurarTabla();

    const [rows] = await pool.query(
      `SELECT mime, datos, nombre_original
       FROM archivos_imagenes
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    const archivo = rows[0];

    if (!archivo) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada.'
      });
    }

    res.setHeader('Content-Type', archivo.mime || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', archivo.datos.length);

    return res.end(archivo.datos);
  } catch (err) {
    next(err);
  }
}
