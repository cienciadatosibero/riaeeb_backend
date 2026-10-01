import pool from '../config/db.js';
import { getColumns, tableExists } from '../utils/schema.js';

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

async function publicRows() {
  if (!(await tableExists('investigaciones'))) return [];
  const cols = await getColumns('investigaciones');
  const pick = (name, fallback='NULL') => cols.has(name) ? `i.\`${name}\`` : `${fallback} AS \`${name}\``;

  const select = [
    pick('id'), pick('titulo', "''"), pick('resumen', "''"),
    pick('impacto_cientifico'), pick('impacto_social'), pick('aportaciones_solucion'), pick('acceso_universal'),
    pick('autores'), pick('area'), pick('area_id'), pick('anio'), pick('enlace'), pick('tipo'), pick('tipo_investigacion_id'),
    pick('estatus', "'en_proceso'"), pick('referencias'), pick('propietario_usuario_id'), pick('publicado', '1'), pick('created_at')
  ];
  let sql = `SELECT ${select.join(', ')} FROM investigaciones i`;
  if (cols.has('publicado')) sql += ` WHERE i.publicado=1`;
  if (cols.has('created_at')) sql += ` ORDER BY i.created_at DESC, i.id DESC`;
  else if (cols.has('anio')) sql += ` ORDER BY i.anio DESC, i.id DESC`;
  else sql += ` ORDER BY i.id DESC`;

  const [rows] = await pool.query(sql);

  let areaNames = new Map();
  if (cols.has('area_id') && await tableExists('areas_conocimiento')) {
    const [a] = await pool.query(`SELECT id,nombre FROM areas_conocimiento`);
    areaNames = new Map(a.map((x)=>[Number(x.id),x.nombre]));
  }
  let typeNames = new Map();
  if (cols.has('tipo_investigacion_id') && await tableExists('tipos_investigacion')) {
    const [t] = await pool.query(`SELECT id,nombre FROM tipos_investigacion`);
    typeNames = new Map(t.map((x)=>[Number(x.id),x.nombre]));
  }

  return rows.map((r)=>({
    ...r,
    area_nombre: areaNames.get(Number(r.area_id)) || r.area || null,
    tipo_nombre: typeNames.get(Number(r.tipo_investigacion_id)) || r.tipo || null,
    estatus: r.estatus || 'en_proceso',
    referencias: parseRefs(r.referencias),
    profesores: [],
    estudiantes: [],
    participando: false,
  }));
}

async function attachParticipants(rows, currentUserId=null) {
  if (!rows.length) return rows;
  const hasParts = await tableExists('investigacion_participantes');
  const hasUsers = await tableExists('usuarios');
  if (!hasParts || !hasUsers) return rows;

  const ids = rows.map((r)=>r.id).filter(Boolean);
  const hasInvestigadores = await tableExists('investigadores');
  const invCols = hasInvestigadores ? await getColumns('investigadores') : new Set();
  const canProfile = hasInvestigadores && invCols.has('usuario_id');
  const canInst = canProfile && invCols.has('institucion_id') && await tableExists('instituciones');

  let sql = `SELECT ip.investigacion_id,ip.usuario_id,ip.tipo,u.nombre_completo`;
  sql += canProfile ? `,p.foto_url${invCols.has('institucion') ? ',p.institucion' : ',NULL AS institucion'}` : `,NULL AS foto_url,NULL AS institucion`;
  sql += canInst ? `,ins.nombre AS institucion_catalogo` : `,NULL AS institucion_catalogo`;
  sql += ` FROM investigacion_participantes ip JOIN usuarios u ON u.id=ip.usuario_id AND u.activo=1`;
  if (canProfile) sql += ` LEFT JOIN investigadores p ON p.usuario_id=u.id`;
  if (canInst) sql += ` LEFT JOIN instituciones ins ON ins.id=p.institucion_id`;
  sql += ` WHERE ip.investigacion_id IN (${ids.map(()=>'?').join(',')}) ORDER BY ip.tipo,u.nombre_completo`;

  const [people] = await pool.query(sql, ids);
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
      profesores:g.profesores,
      estudiantes:g.estudiantes,
      participando: currentUserId ? people.some((p)=>p.investigacion_id===r.id && Number(p.usuario_id)===Number(currentUserId)) : false,
    };
  });
}

export async function findAll() {
  return attachParticipants(await publicRows());
}

export async function findForUser(user) {
  const cols = await getColumns('investigaciones');
  if (!cols.has('propietario_usuario_id') || !(await tableExists('usuarios'))) {
    return attachParticipants(await publicRows(), user?.id);
  }
  const roles = user?.roles || [];
  if (!roles.includes('administrador') && !roles.includes('investigador')) {
    return attachParticipants(await publicRows(), user?.id);
  }

  const selectCols = [...cols].map((c)=>`i.\`${c}\``).join(', ');
  let sql = `SELECT ${selectCols} FROM investigaciones i`;
  const args = [];
  if (roles.includes('investigador')) {
    if (await tableExists('investigacion_participantes')) {
      sql += ` WHERE i.propietario_usuario_id=? OR EXISTS (SELECT 1 FROM investigacion_participantes ip WHERE ip.investigacion_id=i.id AND ip.usuario_id=? AND ip.tipo='profesor')`;
      args.push(user.id,user.id);
    } else {
      sql += ` WHERE i.propietario_usuario_id=?`;
      args.push(user.id);
    }
  }
  sql += cols.has('created_at') ? ` ORDER BY i.created_at DESC,i.id DESC` : ` ORDER BY i.id DESC`;
  const [rows] = await pool.query(sql,args);
  const normalized = rows.map((r)=>({ ...r, referencias:parseRefs(r.referencias), profesores:[], estudiantes:[], participando:false, area_nombre:r.area, tipo_nombre:r.tipo }));
  return attachParticipants(normalized,user?.id);
}

export async function findById(id) {
  const rows = await publicRows();
  return (await attachParticipants(rows.filter((r)=>Number(r.id)===Number(id))))[0] || null;
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
