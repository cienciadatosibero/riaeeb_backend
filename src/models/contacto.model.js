import pool from '../config/db.js';

export async function create(data){
  const {nombre,correo,telefono,asunto,mensaje}=data;
  const [r]=await pool.query(`INSERT INTO mensajes_contacto (nombre,correo,telefono,asunto,mensaje) VALUES (?,?,?,?,?)`,[nombre,correo,telefono||null,asunto,mensaje]);
  return {id:r.insertId};
}
export async function listAll(){
  const [rows]=await pool.query(`SELECT id,nombre,correo,telefono,asunto,mensaje,leido,created_at,updated_at FROM mensajes_contacto ORDER BY created_at DESC,id DESC`);
  return rows;
}
export async function mark(id,leido){
  await pool.query(`UPDATE mensajes_contacto SET leido=? WHERE id=?`,[leido?1:0,id]);
  return {id,leido:leido?1:0};
}
export async function remove(id){
  await pool.query(`DELETE FROM mensajes_contacto WHERE id=?`,[id]);
  return {id};
}
