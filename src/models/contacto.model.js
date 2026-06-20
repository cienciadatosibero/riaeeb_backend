// backend/src/models/contacto.model.js
import pool from '../config/db.js';

export async function create(data) {
  const { nombre, correo, telefono, asunto, mensaje } = data;
  const [result] = await pool.query(
    `INSERT INTO mensajes_contacto (nombre, correo, telefono, asunto, mensaje)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, correo, telefono || null, asunto, mensaje]
  );
  return { id: result.insertId };
}
