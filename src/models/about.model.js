// backend/src/models/about.model.js
import pool from '../config/db.js';

export async function get() {
  const [rows] = await pool.query(`SELECT * FROM about ORDER BY id ASC LIMIT 1`);
  return rows[0] || null;
}
export async function upsert(d) {
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
