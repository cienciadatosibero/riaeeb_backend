import pool from '../config/db.js';
import { getColumns, tableExists } from '../utils/schema.js';

export async function findPublic() {
  if (!(await tableExists('publicaciones_red'))) return [];
  const cols = await getColumns('publicaciones_red');
  const pick = (name, fallback='NULL') => cols.has(name) ? `p.\`${name}\`` : `${fallback} AS \`${name}\``;
  const hasUsers = cols.has('creador_usuario_id') && await tableExists('usuarios');

  const select = [
    pick('id'), pick('titulo', "''"), pick('resumen'), pick('autores', "''"),
    pick('tipo_producto', "'Producto de la Red'"), pick('anio'), pick('enlace'), pick('created_at')
  ];
  select.push(hasUsers ? `u.nombre_completo AS creador` : `NULL AS creador`);

  let sql = `SELECT ${select.join(', ')} FROM publicaciones_red p`;
  if (hasUsers) sql += ` LEFT JOIN usuarios u ON u.id=p.creador_usuario_id`;
  if (cols.has('publicado')) sql += ` WHERE p.publicado=1`;
  if (cols.has('anio') && cols.has('created_at')) sql += ` ORDER BY COALESCE(p.anio,YEAR(p.created_at)) DESC,p.id DESC`;
  else if (cols.has('anio')) sql += ` ORDER BY p.anio DESC,p.id DESC`;
  else sql += ` ORDER BY p.id DESC`;

  const [rows] = await pool.query(sql);
  return rows;
}

export async function findAdmin(user) {
  const admin = (user?.roles || []).includes('administrador');
  const [rows] = admin
    ? await pool.query(`SELECT p.*,u.nombre_completo creador FROM publicaciones_red p LEFT JOIN usuarios u ON u.id=p.creador_usuario_id ORDER BY p.id DESC`)
    : await pool.query(`SELECT p.*,u.nombre_completo creador FROM publicaciones_red p LEFT JOIN usuarios u ON u.id=p.creador_usuario_id WHERE p.creador_usuario_id=? ORDER BY p.id DESC`, [user?.id]);
  return rows;
}

export async function create(d,user) {
  const autores = d.autores || user?.nombre_completo || user?.usuario || 'Miembro de la Red';
  const [r] = await pool.query(
    `INSERT INTO publicaciones_red (titulo,resumen,autores,tipo_producto,anio,enlace,creador_usuario_id,publicado)
     VALUES (?,?,?,?,?,?,?,?)`,
    [d.titulo,d.resumen||null,autores,d.tipo_producto,d.anio||null,d.enlace||null,user?.id||null,d.publicado===false?0:1]
  );
  return { id:r.insertId,...d,autores,creador_usuario_id:user?.id||null };
}

async function canEdit(id,user) {
  if ((user?.roles || []).includes('administrador')) return true;
  const [[row]] = await pool.query(`SELECT creador_usuario_id FROM publicaciones_red WHERE id=?`, [id]);
  return !!row && Number(row.creador_usuario_id) === Number(user?.id);
}

export async function update(id,d,user) {
  if (!(await canEdit(id,user))) { const e=new Error('Solo puedes editar tus propias publicaciones.'); e.statusCode=403; throw e; }
  await pool.query(`UPDATE publicaciones_red SET titulo=?,resumen=?,autores=?,tipo_producto=?,anio=?,enlace=?,publicado=? WHERE id=?`,
    [d.titulo,d.resumen||null,d.autores||user?.nombre_completo||'',d.tipo_producto,d.anio||null,d.enlace||null,d.publicado===false?0:1,id]);
  return { id,...d };
}
export async function remove(id,user) {
  if (!(await canEdit(id,user))) { const e=new Error('Solo puedes eliminar tus propias publicaciones.'); e.statusCode=403; throw e; }
  await pool.query(`DELETE FROM publicaciones_red WHERE id=?`, [id]);
  return { id };
}
