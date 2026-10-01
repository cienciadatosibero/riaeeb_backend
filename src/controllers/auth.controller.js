import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { verifyPassword } from '../utils/password.js';
import { getUserSession } from '../models/seguridad.model.js';

const sign = (session) => jwt.sign({
  id: session.id || null,
  usuario: session.usuario,
  nombre_completo: session.nombre_completo,
  correo: session.correo || null,
  roles: session.roles || [],
  permissions: session.permissions || [],
}, process.env.JWT_SECRET || 'secreto', { expiresIn:'8h' });

export async function login(req,res,next) {
  try {
    const { usuario, password } = req.body || {};
    const envUser = process.env.ADMIN_USER || 'admin';
    const envPass = process.env.ADMIN_PASSWORD || 'admin';

    // Mantiene compatible el acceso administrativo existente por .env.
    if (usuario === envUser && password === envPass) {
      const session = {
        id: null,
        usuario: envUser,
        nombre_completo: 'Administrador',
        correo: null,
        activo: 1,
        roles: ['administrador'],
        permissions: ['*'],
        profile: null,
      };
      return res.json({ success:true, data:{ token:sign(session), ...session } });
    }

    const [rows] = await pool.query(
      `SELECT id,usuario,nombre_completo,correo,password_hash,activo FROM usuarios WHERE usuario=? OR correo=? LIMIT 1`,
      [usuario, usuario]
    );
    const found = rows[0];
    if (!found || !verifyPassword(password, found.password_hash)) {
      return res.status(401).json({ success:false, message:'Usuario o contraseña incorrectos.' });
    }
    if (!found.activo) {
      return res.status(403).json({ success:false, message:'Tu registro aún no ha sido activado por el administrador.' });
    }
    const session = await getUserSession(found.id);
    await pool.query(`UPDATE usuarios SET ultimo_acceso=NOW() WHERE id=?`, [found.id]);
    return res.json({ success:true, data:{ token:sign(session), ...session } });
  } catch (e) { next(e); }
}

export async function me(req,res,next) {
  try {
    if (!req.user?.id) {
      return res.json({ success:true, data:{
        id:null,
        usuario:req.user?.usuario || 'admin',
        nombre_completo:req.user?.nombre_completo || 'Administrador',
        correo:null,
        activo:1,
        roles:['administrador'],
        permissions:['*'],
        profile:null,
      }});
    }
    const session = await getUserSession(req.user.id);
    if (!session || !session.activo) return res.status(401).json({ success:false, message:'La cuenta ya no está activa.' });
    return res.json({ success:true, data:session });
  } catch (e) { next(e); }
}
