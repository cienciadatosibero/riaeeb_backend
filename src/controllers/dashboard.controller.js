import pool from '../config/db.js';

export async function resumen(req,res,next) {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM investigadores i LEFT JOIN usuarios u ON u.id=i.usuario_id
          WHERE i.tipo_perfil='investigador' AND i.activo=1 AND (i.usuario_id IS NULL OR u.activo=1)) investigadores,
        (SELECT COUNT(*) FROM investigaciones) proyectos,
        (SELECT COUNT(*) FROM investigaciones WHERE estatus='en_proceso') en_proceso,
        (SELECT COUNT(*) FROM investigaciones WHERE estatus='terminado') terminados,
        (SELECT COUNT(*) FROM usuarios WHERE activo=0) registros_pendientes,
        (SELECT COUNT(*) FROM publicaciones_red WHERE publicado=1) publicaciones
    `);
    const [instituciones] = await pool.query(`
      SELECT COALESCE(ins.nombre, NULLIF(i.institucion,''), 'Sin institución') etiqueta, COUNT(*) valor
      FROM investigadores i
      LEFT JOIN usuarios u ON u.id=i.usuario_id
      LEFT JOIN instituciones ins ON ins.id=i.institucion_id
      WHERE i.tipo_perfil='investigador' AND i.activo=1 AND (i.usuario_id IS NULL OR u.activo=1)
      GROUP BY etiqueta ORDER BY valor DESC, etiqueta
    `);
    const [areas] = await pool.query(`
      SELECT COALESCE(a.nombre, NULLIF(i.area,''), 'Sin área') etiqueta, COUNT(*) valor
      FROM investigaciones i
      LEFT JOIN areas_conocimiento a ON a.id=i.area_id
      GROUP BY etiqueta ORDER BY valor DESC, etiqueta
    `);
    const [estatus] = await pool.query(`
      SELECT CASE estatus WHEN 'terminado' THEN 'Terminados' ELSE 'En proceso' END etiqueta, COUNT(*) valor
      FROM investigaciones GROUP BY estatus ORDER BY estatus
    `);
    res.json({ success:true, data:{ totals, profesores_por_institucion:instituciones, proyectos_por_area:areas, estatus_proyectos:estatus } });
  } catch (e) { next(e); }
}
