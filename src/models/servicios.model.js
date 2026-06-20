// backend/src/models/servicios.model.js
import pool from '../config/db.js';

export async function findAll() {
  const [rows] = await pool.query(
    `SELECT id, titulo, descripcion, icono
     FROM servicios
     WHERE activo = 1
     ORDER BY orden ASC, id ASC`
  );
  return rows;
}
