import pool from '../config/db.js';

const parseRefs = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  try { const a=JSON.parse(v); if (Array.isArray(a)) return a; } catch {}
  return String(v).split(/\n+/).map((x)=>x.trim()).filter(Boolean);
};
const refsDb = (v) => JSON.stringify(parseRefs(v).slice(0,20));
function validateProject(d) {
  const required = ['titulo','resumen','impacto_cientifico','impacto_social','aportaciones_solucion','acceso_universal'];
  if (required.some((k) => !String(d[k] || '').trim())) {
    const e = new Error('Completa título, resumen, impactos, aportaciones y estrategia de acceso universal.'); e.statusCode=400; throw e;
  }
  if (!d.area_id || !d.tipo_investigacion_id) { const e=new Error('Selecciona el área y el tipo de investigación.'); e.statusCode=400; throw e; }
  if (parseRefs(d.referencias).length < 3) { const e=new Error('Agrega al menos 3 referencias relevantes.'); e.statusCode=400; throw e; }
  for (const k of ['impacto_cientifico','impacto_social','aportaciones_solucion','acceso_universal']) {
    if (String(d[k] || '').length > 600) { const e=new Error('Los campos de impacto, aportaciones y acceso universal admiten máximo 600 caracteres.'); e.statusCode=400; throw e; }
  }
}

async function attachParticipants(rows, currentUserId=null) {
  if (!rows.length) return rows;
  const ids = rows.map((r)=>r.id);
  const [people] = await pool.query(`
    SELECT ip.investigacion_id,ip.usuario_id,ip.tipo,u.nombre_completo,
      p.foto_url,p.institucion,ins.nombre institucion_catalogo
    FROM investigacion_participantes ip
    JOIN usuarios u ON u.id=ip.usuario_id AND u.activo=1
    LEFT JOIN investigadores p ON p.usuario_id=u.id
    LEFT JOIN instituciones ins ON ins.id=p.institucion_id
    WHERE ip.investigacion_id IN (${ids.map(()=>'?').join(',')})
    ORDER BY ip.tipo,u.nombre_completo`, ids);
  const grouped = new Map();
  for (const p of people) {
    if (!grouped.has(p.investigacion_id)) grouped.set(p.investigacion_id, { profesores:[], estudiantes:[] });
    const dst = grouped.get(p.investigacion_id);
    (p.tipo === 'estudiante' ? dst.estudiantes : dst.profesores).push({
      usuario_id:p.usuario_id,
      nombre:p.nombre_completo,
      foto_url:p.foto_url,
      institucion:p.institucion_catalogo || p.institucion || null,
    });
  }
  return rows.map((r)=>{
    const g = grouped.get(r.id) || { profesores:[], estudiantes:[] };
    return {
      ...r,
      referencias: parseRefs(r.referencias),
      profesores:g.profesores,
      estudiantes:g.estudiantes,
      participando: currentUserId ? people.some((p)=>p.investigacion_id===r.id && Number(p.usuario_id)===Number(currentUserId)) : false,
    };
  });
}

const baseSelect = `
  SELECT i.id,i.titulo,i.resumen,i.impacto_cientifico,i.impacto_social,i.aportaciones_solucion,i.acceso_universal,
    i.autores,i.area,i.area_id,COALESCE(a.nombre,i.area) area_nombre,i.anio,i.enlace,i.tipo,i.tipo_investigacion_id,
    COALESCE(t.nombre,i.tipo) tipo_nombre,i.estatus,i.referencias,i.propietario_usuario_id,i.publicado,i.created_at
  FROM investigaciones i
  LEFT JOIN areas_conocimiento a ON a.id=i.area_id
  LEFT JOIN tipos_investigacion t ON t.id=i.tipo_investigacion_id`;

export async function findAll() {
  const [rows] = await pool.query(`${baseSelect} WHERE i.publicado=1 ORDER BY i.created_at DESC,i.id DESC`);
  return attachParticipants(rows);
}

export async function findForUser(user) {
  const roles = user?.roles || [];
  let sql = `${baseSelect}`;
  let args = [];
  if (roles.includes('administrador')) {
    sql += ` ORDER BY i.created_at DESC,i.id DESC`;
  } else if (roles.includes('investigador')) {
    sql += ` WHERE i.propietario_usuario_id=? OR EXISTS (
      SELECT 1 FROM investigacion_participantes ip WHERE ip.investigacion_id=i.id AND ip.usuario_id=? AND ip.tipo='profesor'
    ) ORDER BY i.created_at DESC,i.id DESC`;
    args = [user.id,user.id];
  } else {
    sql += ` WHERE i.publicado=1 ORDER BY i.created_at DESC,i.id DESC`;
  }
  const [rows] = await pool.query(sql,args);
  return attachParticipants(rows,user?.id);
}

export async function findById(id) {
  const [rows] = await pool.query(`${baseSelect} WHERE i.id=?`, [id]);
  return (await attachParticipants(rows))[0] || null;
}

async function ownerAllowed(id,user) {
  if ((user?.roles || []).includes('administrador')) return true;
  const [[r]] = await pool.query(`SELECT propietario_usuario_id FROM investigaciones WHERE id=?`, [id]);
  return !!r && Number(r.propietario_usuario_id) === Number(user?.id);
}

async function setProfessors(conn, investigacionId, ownerId, profesorIds=[]) {
  const ids = [...new Set([ownerId, ...(profesorIds||[])].map(Number).filter(Boolean))];
  await conn.query(`DELETE FROM investigacion_participantes WHERE investigacion_id=? AND tipo='profesor'`, [investigacionId]);
  if (ids.length) {
    await conn.query(
      `INSERT IGNORE INTO investigacion_participantes (investigacion_id,usuario_id,tipo) VALUES ${ids.map(()=>'(?,? ,\'profesor\')').join(',')}`,
      ids.flatMap((u)=>[investigacionId,u])
    );
  }
}

export async function create(d,user) {
  validateProject(d);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const owner = (user?.roles || []).includes('administrador') ? (Number(d.propietario_usuario_id)||null) : user?.id;
    let autores = d.autores || user?.nombre_completo || '';
    if (owner) {
      const [[u]] = await conn.query(`SELECT nombre_completo FROM usuarios WHERE id=?`, [owner]);
      if (u?.nombre_completo && !autores) autores = u.nombre_completo;
    }
    const [[a]] = d.area_id ? await conn.query(`SELECT nombre FROM areas_conocimiento WHERE id=?`,[d.area_id]) : [[]];
    const [[t]] = d.tipo_investigacion_id ? await conn.query(`SELECT nombre FROM tipos_investigacion WHERE id=?`,[d.tipo_investigacion_id]) : [[]];
    const [r] = await conn.query(`
      INSERT INTO investigaciones
      (titulo,resumen,impacto_cientifico,impacto_social,aportaciones_solucion,acceso_universal,autores,area,area_id,anio,enlace,tipo,tipo_investigacion_id,estatus,referencias,propietario_usuario_id,publicado)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      d.titulo,d.resumen,d.impacto_cientifico||null,d.impacto_social||null,d.aportaciones_solucion||null,d.acceso_universal||null,
      autores,a?.nombre||d.area||null,d.area_id||null,d.anio||new Date().getFullYear(),d.enlace||null,t?.nombre||d.tipo||'Proyecto de investigación',
      d.tipo_investigacion_id||null,d.estatus||'en_proceso',refsDb(d.referencias),owner,d.publicado===false?0:1
    ]);
    await setProfessors(conn,r.insertId,owner,d.profesor_ids);
    await conn.commit();
    return findById(r.insertId);
  } catch(e){ await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function update(id,d,user) {
  validateProject(d);
  if (!(await ownerAllowed(id,user))) { const e=new Error('Solo el administrador o el profesor responsable puede editar este proyecto.'); e.statusCode=403; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[prev]] = await conn.query(`SELECT propietario_usuario_id FROM investigaciones WHERE id=?`,[id]);
    const owner = (user?.roles || []).includes('administrador') ? (Number(d.propietario_usuario_id)||prev?.propietario_usuario_id||null) : user.id;
    const [[a]] = d.area_id ? await conn.query(`SELECT nombre FROM areas_conocimiento WHERE id=?`,[d.area_id]) : [[]];
    const [[t]] = d.tipo_investigacion_id ? await conn.query(`SELECT nombre FROM tipos_investigacion WHERE id=?`,[d.tipo_investigacion_id]) : [[]];
    await conn.query(`
      UPDATE investigaciones SET titulo=?,resumen=?,impacto_cientifico=?,impacto_social=?,aportaciones_solucion=?,acceso_universal=?,
      autores=?,area=?,area_id=?,anio=?,enlace=?,tipo=?,tipo_investigacion_id=?,estatus=?,referencias=?,propietario_usuario_id=?,publicado=? WHERE id=?`, [
      d.titulo,d.resumen,d.impacto_cientifico||null,d.impacto_social||null,d.aportaciones_solucion||null,d.acceso_universal||null,
      d.autores||'',a?.nombre||d.area||null,d.area_id||null,d.anio||new Date().getFullYear(),d.enlace||null,t?.nombre||d.tipo||'Proyecto de investigación',
      d.tipo_investigacion_id||null,d.estatus||'en_proceso',refsDb(d.referencias),owner,d.publicado===false?0:1,id
    ]);
    await setProfessors(conn,id,owner,d.profesor_ids);
    await conn.commit();
    return findById(id);
  } catch(e){ await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function remove(id,user) {
  if (!(await ownerAllowed(id,user))) { const e=new Error('Solo el administrador o el profesor responsable puede eliminar este proyecto.'); e.statusCode=403; throw e; }
  await pool.query(`DELETE FROM investigaciones WHERE id=?`,[id]);
  return { id };
}

export async function participate(id,user) {
  if (!(user?.roles || []).includes('estudiante')) { const e=new Error('Esta acción es exclusiva para estudiantes.'); e.statusCode=403; throw e; }
  const [[proj]] = await pool.query(`SELECT id FROM investigaciones WHERE id=? AND publicado=1`,[id]);
  if (!proj) { const e=new Error('Proyecto no disponible.'); e.statusCode=404; throw e; }
  await pool.query(`INSERT IGNORE INTO investigacion_participantes (investigacion_id,usuario_id,tipo) VALUES (?,?,'estudiante')`,[id,user.id]);
  return findForUser(user);
}
export async function leave(id,user) {
  if (!(user?.roles || []).includes('estudiante')) { const e=new Error('Esta acción es exclusiva para estudiantes.'); e.statusCode=403; throw e; }
  await pool.query(`DELETE FROM investigacion_participantes WHERE investigacion_id=? AND usuario_id=? AND tipo='estudiante'`,[id,user.id]);
  return findForUser(user);
}
