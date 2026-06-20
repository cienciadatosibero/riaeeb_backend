// backend/src/models/noticias.model.js
import pool from '../config/db.js';

export async function findAll() {
  const [rows] = await pool.query(
    `SELECT id, titulo, extracto, contenido, categoria, imagen_url, fecha
     FROM noticias ORDER BY fecha DESC`
  );
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query(`SELECT * FROM noticias WHERE id=?`, [id]);
  return rows[0] || null;
}
export async function create(d) {
  const [r] = await pool.query(
    `INSERT INTO noticias (titulo, extracto, contenido, categoria, imagen_url, fecha)
     VALUES (?,?,?,?,?,?)`,
    [d.titulo, d.extracto, d.contenido, d.categoria || 'Comunicado', d.imagen_url, d.fecha]
  );
  return { id: r.insertId, ...d };
}
export async function update(id, d) {
  await pool.query(
    `UPDATE noticias SET titulo=?, extracto=?, contenido=?, categoria=?, imagen_url=?, fecha=?
     WHERE id=?`,
    [d.titulo, d.extracto, d.contenido, d.categoria || 'Comunicado', d.imagen_url, d.fecha, id]
  );
  return { id, ...d };
}
export async function remove(id) {
  await pool.query(`DELETE FROM noticias WHERE id=?`, [id]);
  return { id };
}
