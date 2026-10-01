import pool from '../config/db.js';
import { getUserSession } from '../models/seguridad.model.js';

export async function getMine(req,res,next) {
  try {
    if (!req.user?.id) return res.json({ success:true, data:null });
    const s = await getUserSession(req.user.id);
    res.json({ success:true, data:s?.profile || null });
  } catch (e) { next(e); }
}

export async function updateMine(req,res,next) {
  try {
    if (!req.user?.id) return res.status(400).json({ success:false, message:'La cuenta administrativa por .env no tiene perfil personal.' });
    const semblanza = String(req.body.semblanza ?? '');
    const cvu = String(req.body.cvu_rizoma ?? '').trim();
    if (cvu && !/^\d{7}$/.test(cvu)) return res.status(400).json({ success:false, message:'El CVU Rizoma debe contener exactamente 7 dígitos.' });
    if (semblanza.length > 600) return res.status(400).json({ success:false, message:'La semblanza no puede exceder 600 caracteres.' });
    await pool.query(`UPDATE investigadores SET bio=?, cvu_rizoma=? WHERE usuario_id=?`, [semblanza, cvu || null, req.user.id]);
    const s = await getUserSession(req.user.id);
    res.json({ success:true, data:s?.profile || null });
  } catch (e) { next(e); }
}
