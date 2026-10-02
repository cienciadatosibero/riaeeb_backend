import pool from '../config/db.js';

let estructuraLista=false;

async function columnaExiste(nombre){
  const [[r]]=await pool.query(
    `SELECT COUNT(*) total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE()
       AND TABLE_NAME='mensajes_contacto'
       AND COLUMN_NAME=?`,
    [nombre]
  );
  return Number(r?.total||0)>0;
}

async function ensureReplyColumns(){
  if(estructuraLista) return;
  const cambios=[
    ['respuesta', `ALTER TABLE mensajes_contacto ADD COLUMN respuesta TEXT NULL`],
    ['fecha_respuesta', `ALTER TABLE mensajes_contacto ADD COLUMN fecha_respuesta DATETIME NULL`],
    ['respondido_por', `ALTER TABLE mensajes_contacto ADD COLUMN respondido_por VARCHAR(180) NULL`],
    ['estado', `ALTER TABLE mensajes_contacto ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'nuevo'`],
  ];
  for(const [col,sql] of cambios){
    if(!(await columnaExiste(col))) await pool.query(sql);
  }
  await pool.query(`
    UPDATE mensajes_contacto
       SET estado=CASE
         WHEN fecha_respuesta IS NOT NULL THEN 'respondido'
         WHEN leido=1 THEN 'leido'
         ELSE 'nuevo'
       END
     WHERE estado IS NULL OR estado='' OR estado NOT IN ('nuevo','leido','respondido')
  `);
  estructuraLista=true;
}

export async function create(data){
  await ensureReplyColumns();
  const {nombre,correo,telefono,asunto,mensaje}=data;
  const [r]=await pool.query(
    `INSERT INTO mensajes_contacto (nombre,correo,telefono,asunto,mensaje,estado)
     VALUES (?,?,?,?,?,'nuevo')`,
    [nombre,correo,telefono||null,asunto,mensaje]
  );
  return {id:r.insertId};
}

export async function listAll(){
  await ensureReplyColumns();
  const [rows]=await pool.query(`
    SELECT id,nombre,correo,telefono,asunto,mensaje,leido,respuesta,
           fecha_respuesta,respondido_por,estado,created_at,updated_at
      FROM mensajes_contacto
     ORDER BY created_at DESC,id DESC
  `);
  return rows;
}

export async function findById(id){
  await ensureReplyColumns();
  const [[row]]=await pool.query(`
    SELECT id,nombre,correo,telefono,asunto,mensaje,leido,respuesta,
           fecha_respuesta,respondido_por,estado,created_at,updated_at
      FROM mensajes_contacto
     WHERE id=? LIMIT 1`,[id]);
  return row||null;
}

export async function mark(id,leido){
  await ensureReplyColumns();
  await pool.query(`
    UPDATE mensajes_contacto
       SET leido=?,
           estado=CASE
             WHEN fecha_respuesta IS NOT NULL THEN 'respondido'
             WHEN ?=1 THEN 'leido'
             ELSE 'nuevo'
           END
     WHERE id=?`,[leido?1:0,leido?1:0,id]);
  return findById(id);
}

export async function saveDraft(id,respuesta,usuario){
  await ensureReplyColumns();
  await pool.query(`
    UPDATE mensajes_contacto
       SET respuesta=?, leido=1,
           estado=CASE WHEN fecha_respuesta IS NOT NULL THEN 'respondido' ELSE 'leido' END,
           respondido_por=COALESCE(respondido_por,?)
     WHERE id=?`,[respuesta||null,usuario||null,id]);
  return findById(id);
}

export async function markResponded(id,respuesta,usuario){
  await ensureReplyColumns();
  await pool.query(`
    UPDATE mensajes_contacto
       SET respuesta=?, leido=1, estado='respondido',
           fecha_respuesta=NOW(), respondido_por=?
     WHERE id=?`,[respuesta,usuario||null,id]);
  return findById(id);
}

export async function remove(id){
  await ensureReplyColumns();
  await pool.query(`DELETE FROM mensajes_contacto WHERE id=?`,[id]);
  return {id};
}
