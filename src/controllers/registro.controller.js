import pool from '../config/db.js';
import { createUser } from '../models/seguridad.model.js';

export async function registrar(req,res,next) {
  try {
    const b = req.body || {};
    const obligatorios = ['nombre_completo','correo_institucional','telefono','institucion_id','semblanza','grado_maximo','linea_investigacion','foto_url','password'];
    if (obligatorios.some((k) => !String(b[k] ?? '').trim()) || !(b.area_ids || []).length) {
      return res.status(400).json({ success:false, message:'Completa los campos obligatorios del perfil y selecciona al menos un área de conocimiento.' });
    }
    if (String(b.semblanza || '').length > 600) {
      return res.status(400).json({ success:false, message:'La semblanza no puede exceder 600 caracteres.' });
    }
    const [[rol]] = await pool.query(`SELECT id FROM seguridad_roles WHERE clave='investigador' AND activo=1 LIMIT 1`);
    if (!rol) throw new Error('El rol de investigador no está configurado. Ejecuta la migración v4.');

    const usuario = String(b.usuario || b.correo_institucional).trim().toLowerCase();
    await createUser({
      usuario,
      nombre_completo: b.nombre_completo,
      correo: b.correo_institucional,
      password: b.password,
      activo: false,
      role_ids: [rol.id],
      telefono: b.telefono,
      institucion_id: b.institucion_id,
      semblanza: b.semblanza,
      nivel_snii: b.nivel_snii,
      grado_maximo: b.grado_maximo,
      linea_investigacion: b.linea_investigacion,
      foto_url: b.foto_url,
      logo_institucion_url: b.logo_institucion_url,
      orcid: b.orcid,
      cvu_rizoma: b.cvu_rizoma,
      area_ids: b.area_ids || [],
    });
    res.status(201).json({ success:true, data:{ pendiente:true }, message:'Registro recibido. El administrador debe activar tu cuenta.' });
  } catch (e) {
    if (e?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success:false, message:'El usuario o correo institucional ya está registrado.' });
    }
    next(e);
  }
}
