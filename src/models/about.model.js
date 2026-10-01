import pool from '../config/db.js';
import { tableExists } from '../utils/schema.js';

export async function get() {
  if (!(await tableExists('about'))) return null;
  const [rows] = await pool.query(`SELECT * FROM about ORDER BY id ASC LIMIT 1`);
  return rows[0] || null;
}

export async function upsert(d) {
  if (!(await tableExists('about'))) {
    const e = new Error('La tabla about no existe. Ejecuta la migración v3 antes de editar Quiénes somos.');
    e.statusCode = 409;
    throw e;
  }
  const actual = await get();
  if (actual) {
    await pool.query(
      `UPDATE about SET titulo=?, subtitulo=?, mision=?, vision=?, valores=?, imagen_url=? WHERE id=?`,
      [d.titulo, d.subtitulo, d.mision, d.vision, d.valores, d.imagen_url, actual.id]
    );
    return { id: actual.id, ...d };
  }
  const [r] = await pool.query(
    `INSERT INTO about (titulo, subtitulo, mision, vision, valores, imagen_url) VALUES (?,?,?,?,?,?)`,
    [d.titulo, d.subtitulo, d.mision, d.vision, d.valores, d.imagen_url]
  );
  return { id: r.insertId, ...d };
}
