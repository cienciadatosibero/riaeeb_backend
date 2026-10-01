import pool from '../config/db.js';

const splitIds=(v)=>String(v||'').split(',').filter(Boolean).map(Number);
const splitText=(v)=>String(v||'').split('||').filter(Boolean);
const ids=(v)=>[...new Set((Array.isArray(v)?v:[]).map(Number).filter((x)=>Number.isInteger(x)&&x>0))];

const baseSelect=`
  SELECT i.id,i.usuario_id,i.tipo_perfil,i.nombre,i.rol,i.correo_institucional,i.telefono,i.area,i.institucion_id,
    COALESCE(ins.nombre,i.institucion) institucion,
    COALESCE(i.logo_institucion_url,ins.logo_url) logo_institucion_url,
    i.bio,i.nivel_snii,i.grado_maximo,i.linea_investigacion,i.foto_url,i.enlace,
    COALESCE(i.orcid,CASE WHEN i.enlace LIKE '%orcid.org%' THEN i.enlace END) orcid,
    i.cvu_rizoma,i.orden,i.activo,
    (SELECT GROUP_CONCAT(DISTINCT ia2.area_id ORDER BY a2.nombre)
       FROM investigador_areas ia2
       LEFT JOIN areas_conocimiento a2 ON a2.id=ia2.area_id
      WHERE ia2.investigador_id=i.id) area_ids,
    (SELECT GROUP_CONCAT(DISTINCT a3.nombre ORDER BY a3.nombre SEPARATOR '||')
       FROM investigador_areas ia3
       JOIN areas_conocimiento a3 ON a3.id=ia3.area_id
      WHERE ia3.investigador_id=i.id) areas
  FROM investigadores i
  LEFT JOIN usuarios u ON u.id=i.usuario_id
  LEFT JOIN instituciones ins ON ins.id=i.institucion_id
`;

const map=(rows)=>rows.map((r)=>({...r,area_ids:splitIds(r.area_ids),areas:splitText(r.areas)}));

export async function findAll(){
  // "Investigadores de la Red" NO es un catálogo independiente.
  // Solo muestra usuarios reales, activos, con rol investigador.
  const [rows]=await pool.query(`${baseSelect}
    WHERE i.activo=1
      AND i.tipo_perfil='investigador'
      AND i.usuario_id IS NOT NULL
      AND u.activo=1
      AND EXISTS (
        SELECT 1
        FROM usuario_roles ur
        JOIN seguridad_roles r ON r.id=ur.rol_id AND r.activo=1
        WHERE ur.usuario_id=i.usuario_id
          AND LOWER(TRIM(r.clave))='investigador'
      )
    ORDER BY i.orden ASC,i.nombre ASC`);
  return map(rows);
}

export async function findAllAdmin(){
  // El panel administrativo lista únicamente perfiles ligados a usuarios
  // que actualmente tienen el rol investigador.
  const [rows]=await pool.query(`${baseSelect}
    WHERE i.tipo_perfil='investigador'
      AND i.usuario_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM usuario_roles ur
        JOIN seguridad_roles r ON r.id=ur.rol_id
        WHERE ur.usuario_id=i.usuario_id
          AND LOWER(TRIM(r.clave))='investigador'
      )
    ORDER BY u.activo DESC,i.orden ASC,i.nombre ASC`);
  return map(rows);
}

export async function findById(id){
  const [rows]=await pool.query(`${baseSelect} WHERE i.id=? LIMIT 1`,[id]);
  return map(rows)[0]||null;
}

async function datosRelacion(conn,d){
  const areaIds=ids(d.area_ids);
  let areaLegacy=d.area||null;
  if(areaIds.length){
    const [areas]=await conn.query(`SELECT id,nombre FROM areas_conocimiento WHERE id IN (${areaIds.map(()=>'?').join(',')})`,areaIds);
    if(areas.length!==areaIds.length) throw new Error('Una o más áreas de conocimiento no existen.');
    areaLegacy=areas.map((x)=>x.nombre).join(', ');
  }
  let instNombre=d.institucion||null;
  let instLogo=d.logo_institucion_url||null;
  if(d.institucion_id){
    const [[ins]]=await conn.query(`SELECT nombre,logo_url FROM instituciones WHERE id=? LIMIT 1`,[Number(d.institucion_id)]);
    if(!ins) throw new Error('La institución seleccionada no existe.');
    instNombre=ins.nombre;
    if(!instLogo) instLogo=ins.logo_url||null;
  }
  return {areaIds,areaLegacy,instNombre,instLogo};
}

async function syncAreas(conn,id,areaIds){
  await conn.query(`DELETE FROM investigador_areas WHERE investigador_id=?`,[id]);
  if(areaIds.length){
    await conn.query(
      `INSERT INTO investigador_areas (investigador_id,area_id) VALUES ${areaIds.map(()=>'(?,?)').join(',')}`,
      areaIds.flatMap((a)=>[id,a])
    );
  }
}

function validar(d){
  if(!String(d.nombre||'').trim()) throw new Error('El nombre es obligatorio.');
  const cvu=String(d.cvu_rizoma||'').trim();
  if(cvu && !/^\d{7}$/.test(cvu)) throw new Error('El CVU Rizoma debe contener exactamente 7 dígitos.');
}

export async function create(d){
  validar(d);
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const rel=await datosRelacion(conn,d);
    const [r]=await conn.query(`
      INSERT INTO investigadores
      (usuario_id,tipo_perfil,nombre,rol,correo_institucional,telefono,area,institucion_id,institucion,logo_institucion_url,bio,nivel_snii,grado_maximo,linea_investigacion,foto_url,enlace,orcid,cvu_rizoma,orden,activo)
      VALUES (NULL,'investigador',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        d.nombre,d.rol||'Profesor / Investigador',d.correo_institucional||null,d.telefono||null,rel.areaLegacy,
        d.institucion_id||null,rel.instNombre,rel.instLogo,d.bio||'',d.nivel_snii||null,d.grado_maximo||null,
        d.linea_investigacion||null,d.foto_url||'',d.orcid||null,d.orcid||null,d.cvu_rizoma||null,Number(d.orden)||0,d.activo===false?0:1
      ]
    );
    await syncAreas(conn,r.insertId,rel.areaIds);
    await conn.commit();
    return findById(r.insertId);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

export async function update(id,d){
  validar(d);
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const rel=await datosRelacion(conn,d);
    await conn.query(`
      UPDATE investigadores SET
      nombre=?,rol=?,correo_institucional=?,telefono=?,area=?,institucion_id=?,institucion=?,logo_institucion_url=?,
      bio=?,nivel_snii=?,grado_maximo=?,linea_investigacion=?,foto_url=?,enlace=?,orcid=?,cvu_rizoma=?,orden=?,activo=?
      WHERE id=?`,
      [
        d.nombre,d.rol||'Profesor / Investigador',d.correo_institucional||null,d.telefono||null,rel.areaLegacy,
        d.institucion_id||null,rel.instNombre,rel.instLogo,d.bio||'',d.nivel_snii||null,d.grado_maximo||null,
        d.linea_investigacion||null,d.foto_url||'',d.orcid||null,d.orcid||null,d.cvu_rizoma||null,Number(d.orden)||0,d.activo===false?0:1,id
      ]
    );
    await syncAreas(conn,id,rel.areaIds);
    await conn.commit();
    return findById(id);
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

export async function remove(id){
  await pool.query(`UPDATE investigadores SET activo=0 WHERE id=?`,[id]);
  return {id};
}
