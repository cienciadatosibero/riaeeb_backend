// backend/src/models/investigaciones.model.js
import pool from '../config/db.js';

export async function findAll() {
  const [rows] = await pool.query(
    `SELECT id, titulo, resumen, autores, area, anio, enlace, tipo
     FROM investigaciones ORDER BY anio DESC, id DESC`
  );
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query(`SELECT * FROM investigaciones WHERE id = ?`, [id]);
  return rows[0] || null;
}
export async function create(d) {
  const [r] = await pool.query(
    `INSERT INTO investigaciones (titulo, resumen, autores, area, anio, enlace, tipo)
     VALUES (?,?,?,?,?,?,?)`,
    [d.titulo, d.resumen, d.autores, d.area, d.anio, d.enlace, d.tipo || 'Artículo']
  );
  return { id: r.insertId, ...d };
}
export async function update(id, d) {
  await pool.query(
    `UPDATE investigaciones SET titulo=?, resumen=?, autores=?, area=?, anio=?, enlace=?, tipo=?
     WHERE id=?`,
    [d.titulo, d.resumen, d.autores, d.area, d.anio, d.enlace, d.tipo || 'Artículo', id]
  );
  return { id, ...d };
}
export async function remove(id) {
  await pool.query(`DELETE FROM investigaciones WHERE id=?`, [id]);
  return { id };
}
