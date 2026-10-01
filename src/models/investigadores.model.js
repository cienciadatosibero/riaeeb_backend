import pool from '../config/db.js';

const splitIds = (v) => String(v || '').split(',').filter(Boolean).map(Number);
const splitText = (v) => String(v || '').split('||').filter(Boolean);

export async function findAll() {
  const [rows] = await pool.query(`
    SELECT i.id,i.usuario_id,i.nombre,i.rol,i.correo_institucional,i.telefono,i.area,i.institucion_id,
      COALESCE(ins.nombre,i.institucion) institucion,
      COALESCE(i.logo_institucion_url,ins.logo_url) logo_institucion_url,
      i.bio,i.nivel_snii,i.grado_maximo,i.linea_investigacion,i.foto_url,i.enlace,COALESCE(i.orcid,CASE WHEN i.enlace LIKE '%orcid.org%' THEN i.enlace END) orcid,i.cvu_rizoma,i.orden,
      GROUP_CONCAT(DISTINCT a.id ORDER BY a.nombre) area_ids,
      GROUP_CONCAT(DISTINCT a.nombre ORDER BY a.nombre SEPARATOR '||') areas
    FROM investigadores i
    LEFT JOIN usuarios u ON u.id=i.usuario_id
    LEFT JOIN instituciones ins ON ins.id=i.institucion_id
    LEFT JOIN investigador_areas ia ON ia.investigador_id=i.id
    LEFT JOIN areas_conocimiento a ON a.id=ia.area_id
    WHERE i.activo=1 AND i.tipo_perfil='investigador' AND (i.usuario_id IS NULL OR u.activo=1)
    GROUP BY i.id
    ORDER BY i.orden ASC,i.nombre ASC
  `);
  return rows.map((r)=>({ ...r, area_ids:splitIds(r.area_ids), areas:splitText(r.areas) }));
}
export async function findById(id) {
  const [rows] = await pool.query(`SELECT * FROM investigadores WHERE id=?`,[id]);
  return rows[0] || null;
}
export async function create(d) {
  const [r] = await pool.query(`
    INSERT INTO investigadores
    (nombre,rol,correo_institucional,telefono,area,institucion_id,institucion,logo_institucion_url,bio,nivel_snii,grado_maximo,linea_investigacion,foto_url,enlace,orcid,cvu_rizoma,orden,tipo_perfil,activo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'investigador',1)`,
    [d.nombre,d.rol||'Profesor / Investigador',d.correo_institucional||null,d.telefono||null,d.area||null,d.institucion_id||null,d.institucion||null,
     d.logo_institucion_url||null,d.bio||'',d.nivel_snii||null,d.grado_maximo||null,d.linea_investigacion||null,d.foto_url||'',d.orcid||d.enlace||null,d.orcid||null,d.cvu_rizoma||null,d.orden||0]
  );
  return { id:r.insertId,...d };
}
export async function update(id,d) {
  await pool.query(`UPDATE investigadores SET nombre=?,rol=?,correo_institucional=?,telefono=?,area=?,institucion_id=?,institucion=?,logo_institucion_url=?,bio=?,nivel_snii=?,grado_maximo=?,linea_investigacion=?,foto_url=?,enlace=?,orcid=?,cvu_rizoma=?,orden=? WHERE id=?`,
    [d.nombre,d.rol||'Profesor / Investigador',d.correo_institucional||null,d.telefono||null,d.area||null,d.institucion_id||null,d.institucion||null,d.logo_institucion_url||null,
     d.bio||'',d.nivel_snii||null,d.grado_maximo||null,d.linea_investigacion||null,d.foto_url||'',d.orcid||d.enlace||null,d.orcid||null,d.cvu_rizoma||null,d.orden||0,id]);
  return { id,...d };
}
export async function remove(id) {
  await pool.query(`UPDATE investigadores SET activo=0 WHERE id=?`,[id]);
  return { id };
}
