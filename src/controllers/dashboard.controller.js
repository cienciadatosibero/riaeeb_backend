import pool from '../config/db.js';

export async function resumen(req,res,next) {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        (
          SELECT COUNT(DISTINCT u.id)
          FROM usuarios u
          JOIN usuario_roles ur ON ur.usuario_id=u.id
          JOIN seguridad_roles r ON r.id=ur.rol_id AND r.activo=1
          JOIN investigadores i ON i.usuario_id=u.id AND i.activo=1
          WHERE u.activo=1 AND LOWER(TRIM(r.clave))='investigador'
        ) investigadores,
        (
          SELECT COUNT(DISTINCT u.id)
          FROM usuarios u
          JOIN usuario_roles ur ON ur.usuario_id=u.id
          JOIN seguridad_roles r ON r.id=ur.rol_id AND r.activo=1
          JOIN investigadores i ON i.usuario_id=u.id AND i.activo=1
          WHERE u.activo=1 AND LOWER(TRIM(r.clave))='estudiante'
        ) estudiantes,
        (SELECT COUNT(*) FROM investigaciones) proyectos,
        (SELECT COUNT(*) FROM investigaciones WHERE estatus='en_proceso') en_proceso,
        (SELECT COUNT(*) FROM investigaciones WHERE estatus='terminado') terminados,
        (SELECT COUNT(*) FROM usuarios WHERE activo=0) registros_pendientes,
        (SELECT COUNT(*) FROM publicaciones_red WHERE publicado=1) publicaciones
    `);

    const [instituciones] = await pool.query(`
      SELECT
        COALESCE(ins.nombre, NULLIF(i.institucion,''), 'Sin institución') etiqueta,
        COUNT(DISTINCT u.id) valor
      FROM usuarios u
      JOIN usuario_roles ur ON ur.usuario_id=u.id
      JOIN seguridad_roles r ON r.id=ur.rol_id AND r.activo=1
      JOIN investigadores i ON i.usuario_id=u.id AND i.activo=1
      LEFT JOIN instituciones ins ON ins.id=i.institucion_id
      WHERE u.activo=1
        AND LOWER(TRIM(r.clave))='investigador'
      GROUP BY COALESCE(ins.nombre, NULLIF(i.institucion,''), 'Sin institución')
      ORDER BY valor DESC, etiqueta
    `);

    const [areas] = await pool.query(`
      SELECT COALESCE(a.nombre, NULLIF(i.area,''), 'Sin área') etiqueta, COUNT(*) valor
      FROM investigaciones i
      LEFT JOIN areas_conocimiento a ON a.id=i.area_id
      GROUP BY COALESCE(a.nombre, NULLIF(i.area,''), 'Sin área')
      ORDER BY valor DESC, etiqueta
    `);

    const [estatus] = await pool.query(`
      SELECT CASE estatus WHEN 'terminado' THEN 'Terminados' ELSE 'En proceso' END etiqueta, COUNT(*) valor
      FROM investigaciones
      GROUP BY estatus
      ORDER BY estatus
    `);

    res.json({
      success:true,
      data:{
        totals,
        profesores_por_institucion:instituciones,
        proyectos_por_area:areas,
        estatus_proyectos:estatus
      }
    });
  } catch (e) { next(e); }
}
