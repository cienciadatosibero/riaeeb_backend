// backend/src/models/investigadores.model.js
import pool from '../config/db.js';

export async function findAll() {
  const [rows] = await pool.query(
    `SELECT id, nombre, rol, area, institucion, logo_institucion_url, bio, foto_url, enlace, orden
     FROM investigadores WHERE activo=1 ORDER BY orden ASC, id ASC`
  );
  return rows;
}
export async function findById(id) {
  const [rows] = await pool.query(`SELECT * FROM investigadores WHERE id=?`, [id]);
  return rows[0] || null;
}
export async function create(d) {
  const [r] = await pool.query(
    `INSERT INTO investigadores
      (nombre, rol, area, institucion, logo_institucion_url, bio, foto_url, enlace, orden)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [d.nombre, d.rol, d.area, d.institucion, d.logo_institucion_url, d.bio, d.foto_url, d.enlace, d.orden || 0]
  );
  return { id: r.insertId, ...d };
}
export async function update(id, d) {
  await pool.query(
    `UPDATE investigadores SET nombre=?, rol=?, area=?, institucion=?, logo_institucion_url=?,
      bio=?, foto_url=?, enlace=?, orden=? WHERE id=?`,
    [d.nombre, d.rol, d.area, d.institucion, d.logo_institucion_url, d.bio, d.foto_url, d.enlace, d.orden || 0, id]
  );
  return { id, ...d };
}
export async function remove(id) {
  await pool.query(`DELETE FROM investigadores WHERE id=?`, [id]);
  return { id };
}
