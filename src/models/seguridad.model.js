import pool from '../config/db.js';
import { hashPassword } from '../utils/password.js';

const splitIds = (v) => String(v || '').split(',').filter(Boolean).map(Number);
const splitText = (v) => String(v || '').split('||').filter(Boolean);

let catalogoSeguridadListo=false;
async function ensureSystemModules(){
  if(catalogoSeguridadListo) return;

  const modulos=[
    ['dashboard','Dashboard','Indicadores generales y estadísticas de la Red'],
    ['investigaciones','Investigaciones','Proyectos de investigación de la Red'],
    ['investigadores','Personas de la Red','Perfiles públicos de profesores e investigadores'],
    ['publicaciones','Publicaciones de la Red','Productos generados por integrantes de la Red'],
    ['perfil','Mi Perfil','Consulta y actualización del perfil personal'],
    ['instituciones','Instituciones','Catálogo de instituciones de adscripción'],
    ['areas_conocimiento','Áreas de conocimiento','Catálogo de áreas de conocimiento'],
    ['areas_investigacion','Áreas de investigación','Catálogo de áreas temáticas de investigación'],
    ['tipos_investigacion','Tipos de investigaciones','Catálogo de tipos de investigación'],
    ['noticias','Noticias','Administración de noticias públicas'],
    ['about','Quiénes somos','Contenido institucional de la Red'],
    ['portada','Portada','Textos, contacto, redes y cifras de la portada pública'],
    ['mensajes_contacto','Mensajes de contacto','Mensajes recibidos desde el sitio público'],
    ['seguridad_modulos','Seguridad - Módulos','Catálogo de módulos del sistema'],
    ['seguridad_permisos','Seguridad - Permisos','Permisos de lectura, escritura, actualización y eliminación'],
    ['seguridad_roles','Seguridad - Roles','Roles y permisos asociados'],
    ['seguridad_usuarios','Seguridad - Usuarios','Usuarios, activación y roles']
  ];

  for(const [clave,nombre,descripcion] of modulos){
    await pool.query(
      `INSERT INTO seguridad_modulos (clave,nombre,descripcion,activo)
       VALUES (?,?,?,1)
       ON DUPLICATE KEY UPDATE nombre=VALUES(nombre),descripcion=VALUES(descripcion),activo=1`,
      [clave,nombre,descripcion]
    );
  }

  for(const accion of ['lectura','escritura','actualizar','eliminar']){
    await pool.query(
      `INSERT INTO seguridad_permisos (modulo_id,accion,clave,descripcion,activo)
       SELECT m.id, ?, CONCAT(m.clave,'.',?), CONCAT(?, ' - ', m.nombre), 1
       FROM seguridad_modulos m
       ON DUPLICATE KEY UPDATE
         modulo_id=VALUES(modulo_id),
         accion=VALUES(accion),
         descripcion=VALUES(descripcion),
         activo=1`,
      [accion,accion,accion[0].toUpperCase()+accion.slice(1)]
    );
  }

  await pool.query(
    `INSERT IGNORE INTO seguridad_rol_permisos (rol_id,permiso_id)
     SELECT r.id,p.id
     FROM seguridad_roles r
     CROSS JOIN seguridad_permisos p
     WHERE r.clave='administrador'`
  );

  catalogoSeguridadListo=true;
}

export async function getUserSession(id) {
  await ensureSystemModules();
  const [users] = await pool.query(
    `SELECT id, usuario, nombre_completo, correo, activo
     FROM usuarios
     WHERE id=?
     LIMIT 1`,
    [id]
  );

  const user = users[0];
  if (!user) return null;

  const [roles] = await pool.query(
    `SELECT r.id, LOWER(TRIM(r.clave)) AS clave, r.nombre
     FROM usuario_roles ur
     JOIN seguridad_roles r
       ON r.id=ur.rol_id
      AND r.activo=1
     WHERE ur.usuario_id=?
     ORDER BY r.id`,
    [id]
  );

  // No usamos p.clave para autorizar porque puede haber quedado desfasada
  // respecto a la clave del módulo. La clave efectiva se construye siempre
  // como modulo.accion.
  const [perms] = await pool.query(
    `SELECT DISTINCT
       CONCAT(LOWER(TRIM(m.clave)), '.', LOWER(TRIM(p.accion))) AS clave
     FROM usuario_roles ur
     JOIN seguridad_roles r
       ON r.id=ur.rol_id
      AND r.activo=1
     JOIN seguridad_rol_permisos rp
       ON rp.rol_id=ur.rol_id
     JOIN seguridad_permisos p
       ON p.id=rp.permiso_id
      AND p.activo=1
     JOIN seguridad_modulos m
       ON m.id=p.modulo_id
      AND m.activo=1
     WHERE ur.usuario_id=?
     ORDER BY clave`,
    [id]
  );

  const [profiles] = await pool.query(
    `SELECT i.*, ins.nombre institucion_catalogo, ins.logo_url logo_catalogo,
      (
        SELECT GROUP_CONCAT(DISTINCT ia2.area_id ORDER BY a2.nombre)
        FROM investigador_areas ia2
        LEFT JOIN areas_conocimiento a2 ON a2.id=ia2.area_id
        WHERE ia2.investigador_id=i.id
      ) area_ids,
      (
        SELECT GROUP_CONCAT(DISTINCT a3.nombre ORDER BY a3.nombre SEPARATOR '||')
        FROM investigador_areas ia3
        JOIN areas_conocimiento a3 ON a3.id=ia3.area_id
        WHERE ia3.investigador_id=i.id
      ) areas
     FROM investigadores i
     LEFT JOIN instituciones ins ON ins.id=i.institucion_id
     WHERE i.usuario_id=?
     LIMIT 1`,
    [id]
  );

  const profile = profiles[0]
    ? {
        ...profiles[0],
        area_ids: splitIds(profiles[0].area_ids),
        areas: splitText(profiles[0].areas),
      }
    : null;

  const roleKeys = roles.map((r) => r.clave);
  const permissions = perms.map((p) => p.clave);

  if (roleKeys.includes('administrador') && !permissions.includes('*')) {
    permissions.push('*');
  }

  return {
    ...user,
    roles: roleKeys,
    roles_detalle: roles,
    permissions,
    profile,
  };
}

export async function listModules() {
  await ensureSystemModules();
  const [rows] = await pool.query(
    `SELECT m.id, m.clave, m.nombre, m.descripcion, m.activo,
      COUNT(p.id) permisos
     FROM seguridad_modulos m
     LEFT JOIN seguridad_permisos p ON p.modulo_id=m.id
     GROUP BY m.id ORDER BY m.nombre`
  );
  return rows;
}

export async function createModule(d) {
  const [r] = await pool.query(
    `INSERT INTO seguridad_modulos (clave,nombre,descripcion,activo) VALUES (?,?,?,?)`,
    [d.clave, d.nombre, d.descripcion || null, d.activo === false ? 0 : 1]
  );
  return { id: r.insertId, ...d };
}
export async function updateModule(id, d) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE seguridad_modulos SET clave=?, nombre=?, descripcion=?, activo=? WHERE id=?`,
      [d.clave, d.nombre, d.descripcion || null, d.activo === false ? 0 : 1, id]);
    await conn.query(`UPDATE seguridad_permisos SET clave=CONCAT(?,'.',accion) WHERE modulo_id=?`, [d.clave, id]);
    await conn.commit();
    return { id, ...d };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
export async function removeModule(id) {
  await pool.query(`DELETE FROM seguridad_modulos WHERE id=?`, [id]);
  return { id };
}

export async function listPermissions() {
  await ensureSystemModules();
  const [rows] = await pool.query(
    `SELECT p.id, p.modulo_id, m.nombre modulo, m.clave modulo_clave, p.accion, p.clave, p.descripcion, p.activo
     FROM seguridad_permisos p JOIN seguridad_modulos m ON m.id=p.modulo_id
     ORDER BY m.nombre, FIELD(p.accion,'lectura','escritura','actualizar','eliminar')`
  );
  return rows;
}
export async function createPermission(d) {
  const [[m]] = await pool.query(`SELECT clave FROM seguridad_modulos WHERE id=?`, [d.modulo_id]);
  if (!m) throw new Error('El módulo seleccionado no existe.');
  const clave = d.clave || `${m.clave}.${d.accion}`;
  const [r] = await pool.query(
    `INSERT INTO seguridad_permisos (modulo_id,accion,clave,descripcion,activo) VALUES (?,?,?,?,?)`,
    [d.modulo_id, d.accion, clave, d.descripcion || null, d.activo === false ? 0 : 1]
  );
  return { id: r.insertId, ...d, clave };
}
export async function updatePermission(id, d) {
  const [[m]] = await pool.query(`SELECT clave FROM seguridad_modulos WHERE id=?`, [d.modulo_id]);
  if (!m) throw new Error('El módulo seleccionado no existe.');
  const clave = d.clave || `${m.clave}.${d.accion}`;
  await pool.query(`UPDATE seguridad_permisos SET modulo_id=?, accion=?, clave=?, descripcion=?, activo=? WHERE id=?`,
    [d.modulo_id, d.accion, clave, d.descripcion || null, d.activo === false ? 0 : 1, id]);
  return { id, ...d, clave };
}
export async function removePermission(id) {
  await pool.query(`DELETE FROM seguridad_permisos WHERE id=?`, [id]);
  return { id };
}

export async function listRoles() {
  await ensureSystemModules();
  const [rows] = await pool.query(
    `SELECT r.id, r.clave, r.nombre, r.descripcion, r.activo,
      GROUP_CONCAT(DISTINCT p.id ORDER BY p.id) permiso_ids,
      GROUP_CONCAT(DISTINCT p.clave ORDER BY p.clave SEPARATOR '||') permisos
     FROM seguridad_roles r
     LEFT JOIN seguridad_rol_permisos rp ON rp.rol_id=r.id
     LEFT JOIN seguridad_permisos p ON p.id=rp.permiso_id
     GROUP BY r.id ORDER BY r.nombre`
  );
  return rows.map((r) => ({ ...r, permiso_ids: splitIds(r.permiso_ids), permisos: splitText(r.permisos) }));
}
async function setRolePermissions(conn, roleId, ids = []) {
  await conn.query(`DELETE FROM seguridad_rol_permisos WHERE rol_id=?`, [roleId]);
  const clean = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (clean.length) {
    await conn.query(
      `INSERT INTO seguridad_rol_permisos (rol_id,permiso_id) VALUES ${clean.map(() => '(?,?)').join(',')}`,
      clean.flatMap((p) => [roleId, p])
    );
  }
}
export async function createRole(d) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(`INSERT INTO seguridad_roles (clave,nombre,descripcion,activo) VALUES (?,?,?,?)`,
      [d.clave, d.nombre, d.descripcion || null, d.activo === false ? 0 : 1]);
    await setRolePermissions(conn, r.insertId, d.permiso_ids);
    await conn.commit();
    return { id: r.insertId, ...d };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
export async function updateRole(id, d) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE seguridad_roles SET clave=?, nombre=?, descripcion=?, activo=? WHERE id=?`,
      [d.clave, d.nombre, d.descripcion || null, d.activo === false ? 0 : 1, id]);
    await setRolePermissions(conn, id, d.permiso_ids);
    await conn.commit();
    return { id, ...d };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
export async function removeRole(id) {
  const [[r]] = await pool.query(`SELECT clave FROM seguridad_roles WHERE id=?`, [id]);
  if (['administrador','investigador','estudiante'].includes(r?.clave)) {
    throw new Error('Los roles base del sistema no se pueden eliminar. Puedes modificar sus permisos.');
  }
  await pool.query(`DELETE FROM seguridad_roles WHERE id=?`, [id]);
  return { id };
}

export async function listUsers() {
  const [rows] = await pool.query(
    `SELECT u.id,u.usuario,u.nombre_completo,u.correo,u.activo,u.aprobado_por,u.aprobado_at,u.created_at,
      GROUP_CONCAT(DISTINCT r.id ORDER BY r.id) role_ids,
      GROUP_CONCAT(DISTINCT r.clave ORDER BY r.id SEPARATOR '||') roles,
      i.id perfil_id,i.tipo_perfil,i.telefono,i.institucion_id,i.bio semblanza,i.nivel_snii,i.grado_maximo,
      i.linea_investigacion,i.foto_url,i.logo_institucion_url,i.orcid,i.cvu_rizoma,
      GROUP_CONCAT(DISTINCT a.id ORDER BY a.nombre) area_ids,
      GROUP_CONCAT(DISTINCT a.nombre ORDER BY a.nombre SEPARATOR '||') areas
     FROM usuarios u
     LEFT JOIN usuario_roles ur ON ur.usuario_id=u.id
     LEFT JOIN seguridad_roles r ON r.id=ur.rol_id
     LEFT JOIN investigadores i ON i.usuario_id=u.id
     LEFT JOIN investigador_areas ia ON ia.investigador_id=i.id
     LEFT JOIN areas_conocimiento a ON a.id=ia.area_id
     GROUP BY u.id,i.id ORDER BY u.created_at DESC`
  );
  return rows.map((u) => ({
    ...u,
    role_ids: splitIds(u.role_ids),
    roles: splitText(u.roles),
    area_ids: splitIds(u.area_ids),
    areas: splitText(u.areas),
  }));
}

async function getRoleSlugs(conn, ids) {
  const clean = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (!clean.length) return [];
  const [rows] = await conn.query(`SELECT id,clave FROM seguridad_roles WHERE id IN (${clean.map(() => '?').join(',')})`, clean);
  return rows;
}

async function setUserRoles(conn, userId, roleIds) {
  await conn.query(`DELETE FROM usuario_roles WHERE usuario_id=?`, [userId]);
  const clean = [...new Set((roleIds || []).map(Number).filter(Boolean))];
  if (clean.length) {
    await conn.query(
      `INSERT INTO usuario_roles (usuario_id,rol_id) VALUES ${clean.map(() => '(?,?)').join(',')}`,
      clean.flatMap((r) => [userId, r])
    );
  }
}

async function syncProfile(conn, userId, d, roleRows) {
  const slugs = roleRows.map((r) => r.clave);
  const tipo = slugs.includes('investigador') ? 'investigador' : slugs.includes('estudiante') ? 'estudiante' : null;
  const [[existing]] = await conn.query(`SELECT id FROM investigadores WHERE usuario_id=? LIMIT 1`, [userId]);
  if (!tipo) {
    if (existing) await conn.query(`UPDATE investigadores SET activo=0 WHERE id=?`, [existing.id]);
    return;
  }

  const [[inst]] = d.institucion_id
    ? await conn.query(`SELECT nombre,logo_url FROM instituciones WHERE id=?`, [d.institucion_id])
    : [[]];
  const areaIds = [...new Set((d.area_ids || []).map(Number).filter(Boolean))];
  let areaNombre = null;
  if (areaIds.length) {
    const [[a]] = await conn.query(`SELECT nombre FROM areas_conocimiento WHERE id=?`, [areaIds[0]]);
    areaNombre = a?.nombre || null;
  }
  const labelRol = tipo === 'investigador' ? 'Profesor / Investigador' : 'Estudiante';
  const params = [
    tipo, d.nombre_completo, labelRol, d.correo, d.telefono || null, areaNombre,
    d.institucion_id || null, inst?.nombre || null, d.logo_institucion_url || inst?.logo_url || null,
    d.semblanza || '', d.nivel_snii || null, d.grado_maximo || null, d.linea_investigacion || null,
    d.foto_url || '', d.orcid || null, d.orcid || null, d.cvu_rizoma || null,
    d.activo ? 1 : 0,
  ];
  let perfilId = existing?.id;
  if (perfilId) {
    await conn.query(
      `UPDATE investigadores SET tipo_perfil=?,nombre=?,rol=?,correo_institucional=?,telefono=?,area=?,institucion_id=?,
       institucion=?,logo_institucion_url=?,bio=?,nivel_snii=?,grado_maximo=?,linea_investigacion=?,foto_url=?,enlace=?,orcid=?,cvu_rizoma=?,activo=?
       WHERE id=?`, [...params, perfilId]
    );
  } else {
    const [r] = await conn.query(
      `INSERT INTO investigadores (usuario_id,tipo_perfil,nombre,rol,correo_institucional,telefono,area,institucion_id,institucion,
       logo_institucion_url,bio,nivel_snii,grado_maximo,linea_investigacion,foto_url,enlace,orcid,cvu_rizoma,orden,activo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      [userId, ...params]
    );
    perfilId = r.insertId;
  }
  await conn.query(`DELETE FROM investigador_areas WHERE investigador_id=?`, [perfilId]);
  if (areaIds.length) {
    await conn.query(
      `INSERT INTO investigador_areas (investigador_id,area_id) VALUES ${areaIds.map(() => '(?,?)').join(',')}`,
      areaIds.flatMap((a) => [perfilId, a])
    );
  }
}

export async function createUser(d) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hash = hashPassword(d.password);
    const [r] = await conn.query(
      `INSERT INTO usuarios (usuario,nombre_completo,correo,password_hash,activo,aprobado_por,aprobado_at)
       VALUES (?,?,?,?,?,?,?)`,
      [d.usuario, d.nombre_completo, d.correo, hash, d.activo ? 1 : 0,
       d.activo ? (d.aprobado_por || 'Administrador') : null, d.activo ? new Date() : null]
    );
    const roleRows = await getRoleSlugs(conn, d.role_ids);
    await setUserRoles(conn, r.insertId, d.role_ids);
    await syncProfile(conn, r.insertId, d, roleRows);
    await conn.commit();
    return getUserSession(r.insertId);
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function updateUser(id, d) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[prev]] = await conn.query(`SELECT activo FROM usuarios WHERE id=?`, [id]);
    if (!prev) throw new Error('Usuario no encontrado.');
    const activateNow = !prev.activo && !!d.activo;
    if (d.password) {
      await conn.query(
        `UPDATE usuarios SET usuario=?,nombre_completo=?,correo=?,password_hash=?,activo=?,aprobado_por=COALESCE(?,aprobado_por),aprobado_at=CASE WHEN ? THEN NOW() ELSE aprobado_at END WHERE id=?`,
        [d.usuario,d.nombre_completo,d.correo,hashPassword(d.password),d.activo?1:0,activateNow?(d.aprobado_por||'Administrador'):null,activateNow?1:0,id]
      );
    } else {
      await conn.query(
        `UPDATE usuarios SET usuario=?,nombre_completo=?,correo=?,activo=?,aprobado_por=COALESCE(?,aprobado_por),aprobado_at=CASE WHEN ? THEN NOW() ELSE aprobado_at END WHERE id=?`,
        [d.usuario,d.nombre_completo,d.correo,d.activo?1:0,activateNow?(d.aprobado_por||'Administrador'):null,activateNow?1:0,id]
      );
    }
    const roleRows = await getRoleSlugs(conn, d.role_ids);
    await setUserRoles(conn, id, d.role_ids);
    await syncProfile(conn, id, d, roleRows);
    await conn.commit();
    return getUserSession(id);
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function removeUser(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM investigadores WHERE usuario_id=?`, [id]);
    await conn.query(`DELETE FROM usuarios WHERE id=?`, [id]);
    await conn.commit();
    return { id };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
