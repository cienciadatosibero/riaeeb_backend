// backend/src/models/instituciones.model.js
import pool from '../config/db.js';

export async function findAll() {
  const [rows] = await pool.query(
    `SELECT id, nombre, logo_url, enlace, orden FROM instituciones WHERE activo=1 ORDER BY orden ASC, id ASC`
  );
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query(`SELECT * FROM instituciones WHERE id=?`, [id]);
  return rows[0] || null;
}
export async function create(d) {
  const [r] = await pool.query(
    `INSERT INTO instituciones (nombre, logo_url, enlace, orden) VALUES (?,?,?,?)`,
    [d.nombre, d.logo_url, d.enlace, d.orden || 0]
  );
  return { id: r.insertId, ...d };
}
export async function update(id, d) {
  await pool.query(
    `UPDATE instituciones SET nombre=?, logo_url=?, enlace=?, orden=? WHERE id=?`,
    [d.nombre, d.logo_url, d.enlace, d.orden || 0, id]
  );
  return { id, ...d };
}
export async function remove(id) {
  await pool.query(`DELETE FROM instituciones WHERE id=?`, [id]);
  return { id };
}
