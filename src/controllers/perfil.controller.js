import pool from '../config/db.js';
import { getUserSession } from '../models/seguridad.model.js';

const texto = (v, max = 1000) => String(v ?? '').trim().slice(0, max);
const ids = (v) => Array.isArray(v)
  ? [...new Set(v.map(Number).filter((x)=>Number.isInteger(x) && x > 0))]
  : [];

export async function getMine(req,res,next) {
  try {
    if (!req.user?.id) return res.json({ success:true, data:null });
    const s = await getUserSession(req.user.id);
    res.json({ success:true, data:s?.profile || null });
  } catch (e) { next(e); }
}

export async function updateMine(req,res,next) {
  const conn = await pool.getConnection();
  try {
    if (!req.user?.id) {
      return res.status(400).json({
        success:false,
        message:'Esta cuenta no tiene un perfil personal asociado.'
      });
    }

    const [[actual]] = await conn.query(
      `SELECT id, tipo_perfil
       FROM investigadores
       WHERE usuario_id=?
       LIMIT 1`,
      [req.user.id]
    );

    if (!actual) {
      return res.status(404).json({
        success:false,
        message:'Tu usuario todavía no tiene un perfil de investigador o estudiante asociado.'
      });
    }

    const esInvestigador = actual.tipo_perfil === 'investigador';

    const nombre = texto(req.body.nombre, 180);
    const correo = texto(req.body.correo_institucional, 180);
    const telefono = texto(req.body.telefono, 40);
    const semblanza = String(req.body.semblanza ?? '').trim();
    const grado = texto(req.body.grado_maximo, 160);
    const linea = texto(req.body.linea_investigacion, 300);
    const foto = texto(req.body.foto_url, 500);
    const logo = texto(req.body.logo_institucion_url, 500);
    const orcid = texto(req.body.orcid, 300);
    const areaIds = ids(req.body.area_ids);
    const institucionId = Number(req.body.institucion_id) || null;
    const snii = esInvestigador ? texto(req.body.nivel_snii, 80) : null;
    const cvu = esInvestigador ? texto(req.body.cvu_rizoma, 7) : null;

    if (!nombre) return res.status(400).json({ success:false, message:'El nombre completo es obligatorio.' });
    if (!correo) return res.status(400).json({ success:false, message:'El correo institucional es obligatorio.' });
    if (semblanza.length > 600) return res.status(400).json({ success:false, message:'La semblanza no puede exceder 600 caracteres.' });
    if (!areaIds.length) return res.status(400).json({ success:false, message:'Selecciona al menos un área de conocimiento.' });
    if (esInvestigador && cvu && !/^\d{7}$/.test(cvu)) {
      return res.status(400).json({ success:false, message:'El CVU Rizoma debe contener exactamente 7 dígitos.' });
    }

    let institucionNombre = null;
    if (institucionId) {
      const [[inst]] = await conn.query(
        `SELECT nombre FROM instituciones WHERE id=? LIMIT 1`,
        [institucionId]
      );
      if (!inst) {
        return res.status(400).json({ success:false, message:'La institución seleccionada no existe.' });
      }
      institucionNombre = inst.nombre;
    }

    const [areasValidas] = await conn.query(
      `SELECT id, nombre
       FROM areas_conocimiento
       WHERE id IN (?)`,
      [areaIds]
    );

    if (areasValidas.length !== areaIds.length) {
      return res.status(400).json({ success:false, message:'Una o más áreas de conocimiento no son válidas.' });
    }

    const areaLegacy = areasValidas.map((a)=>a.nombre).join(', ');

    await conn.beginTransaction();

    await conn.query(
      `UPDATE investigadores
       SET nombre=?,
           correo_institucional=?,
           telefono=?,
           area=?,
           institucion_id=?,
           institucion=?,
           logo_institucion_url=?,
           bio=?,
           nivel_snii=?,
           grado_maximo=?,
           linea_investigacion=?,
           foto_url=?,
           enlace=?,
           orcid=?,
           cvu_rizoma=?
       WHERE id=?`,
      [
        nombre,
        correo,
        telefono || null,
        areaLegacy || null,
        institucionId,
        institucionNombre,
        logo || null,
        semblanza,
        snii || null,
        grado || null,
        linea || null,
        foto || null,
        orcid || null,
        orcid || null,
        cvu || null,
        actual.id,
      ]
    );

    await conn.query(
      `UPDATE usuarios
       SET nombre_completo=?, correo=?
       WHERE id=?`,
      [nombre, correo, req.user.id]
    );

    await conn.query(`DELETE FROM investigador_areas WHERE investigador_id=?`, [actual.id]);

    if (areaIds.length) {
      const placeholders = areaIds.map(()=>'(?,?)').join(',');
      const params = areaIds.flatMap((areaId)=>[actual.id, areaId]);
      await conn.query(
        `INSERT INTO investigador_areas (investigador_id, area_id)
         VALUES ${placeholders}`,
        params
      );
    }

    await conn.commit();

    const s = await getUserSession(req.user.id);
    return res.json({ success:true, data:s?.profile || null });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
}
