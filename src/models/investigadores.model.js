import pool from '../config/db.js';
import { getColumns, tableExists } from '../utils/schema.js';

const splitIds = (v) => String(v || '').split(',').filter(Boolean).map(Number);
const splitText = (v) => String(v || '').split('||').filter(Boolean);

function field(cols, name, fallback = 'NULL') {
  return cols.has(name) ? `i.\`${name}\`` : `${fallback} AS \`${name}\``;
}

export async function findAll() {
  if (!(await tableExists('investigadores'))) return [];

  const cols = await getColumns('investigadores');
  const hasInstTable = await tableExists('instituciones');
  const canJoinInst = hasInstTable && cols.has('institucion_id');
  const hasUsuarioTable = await tableExists('usuarios');
  const canJoinUsuario = hasUsuarioTable && cols.has('usuario_id');

  const select = [
    field(cols, 'id'),
    field(cols, 'usuario_id'),
    field(cols, 'nombre', "''"),
    field(cols, 'rol', "''"),
    field(cols, 'correo_institucional'),
    field(cols, 'telefono'),
    field(cols, 'area'),
    field(cols, 'institucion_id'),
    cols.has('institucion') && canJoinInst
      ? `COALESCE(ins.nombre, i.institucion) AS institucion`
      : cols.has('institucion')
        ? `i.institucion AS institucion`
        : canJoinInst
          ? `ins.nombre AS institucion`
          : `NULL AS institucion`,
    cols.has('logo_institucion_url') && canJoinInst
      ? `COALESCE(i.logo_institucion_url, ins.logo_url) AS logo_institucion_url`
      : cols.has('logo_institucion_url')
        ? `i.logo_institucion_url AS logo_institucion_url`
        : canJoinInst
          ? `ins.logo_url AS logo_institucion_url`
          : `NULL AS logo_institucion_url`,
    field(cols, 'bio', "''"),
    field(cols, 'nivel_snii'),
    field(cols, 'grado_maximo'),
    field(cols, 'linea_investigacion'),
    field(cols, 'foto_url', "''"),
    field(cols, 'enlace'),
    cols.has('orcid')
      ? `COALESCE(i.orcid, CASE WHEN i.enlace LIKE '%orcid.org%' THEN i.enlace END) AS orcid`
      : cols.has('enlace')
        ? `CASE WHEN i.enlace LIKE '%orcid.org%' THEN i.enlace END AS orcid`
        : `NULL AS orcid`,
    field(cols, 'cvu_rizoma'),
    field(cols, 'orden', '0'),
  ];

  let sql = `SELECT ${select.join(', ')} FROM investigadores i`;
  if (canJoinInst) sql += ` LEFT JOIN instituciones ins ON ins.id=i.institucion_id`;
  if (canJoinUsuario) sql += ` LEFT JOIN usuarios u ON u.id=i.usuario_id`;

  const where = [];
  if (cols.has('activo')) where.push(`i.activo=1`);
  if (cols.has('tipo_perfil')) where.push(`i.tipo_perfil='investigador'`);
  if (canJoinUsuario) where.push(`(i.usuario_id IS NULL OR u.activo=1)`);
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += cols.has('orden') ? ` ORDER BY i.orden ASC, i.nombre ASC` : ` ORDER BY i.nombre ASC`;

  const [rows] = await pool.query(sql);

  const canLoadAreas = await tableExists('investigador_areas') && await tableExists('areas_conocimiento');
  if (!canLoadAreas || !rows.length) {
    return rows.map((r) => ({
      ...r,
      area_ids: [],
      areas: r.area ? [r.area] : [],
    }));
  }

  const ids = rows.map((r) => r.id).filter(Boolean);
  const [areas] = await pool.query(
    `SELECT ia.investigador_id,
            GROUP_CONCAT(DISTINCT a.id ORDER BY a.nombre) AS area_ids,
            GROUP_CONCAT(DISTINCT a.nombre ORDER BY a.nombre SEPARATOR '||') AS areas
       FROM investigador_areas ia
       JOIN areas_conocimiento a ON a.id=ia.area_id
      WHERE ia.investigador_id IN (${ids.map(() => '?').join(',')})
      GROUP BY ia.investigador_id`,
    ids
  );
  const map = new Map(areas.map((a) => [Number(a.investigador_id), a]));

  return rows.map((r) => {
    const a = map.get(Number(r.id));
    return {
      ...r,
      area_ids: splitIds(a?.area_ids),
      areas: a?.areas ? splitText(a.areas) : (r.area ? [r.area] : []),
    };
  });
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
