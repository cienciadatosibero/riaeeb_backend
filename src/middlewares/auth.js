import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

async function refreshAccess(user) {
  if (!user?.id) return user;

  const [rows] = await pool.query(
    `SELECT DISTINCT r.clave AS rol, p.clave AS permiso
     FROM usuario_roles ur
     JOIN seguridad_roles r ON r.id = ur.rol_id AND r.activo = 1
     LEFT JOIN seguridad_rol_permisos rp ON rp.rol_id = r.id
     LEFT JOIN seguridad_permisos p ON p.id = rp.permiso_id AND p.activo = 1
     WHERE ur.usuario_id = ?`,
    [user.id]
  );

  const roles = [...new Set(rows.map((x) => x.rol).filter(Boolean))];
  const permissions = [...new Set(rows.map((x) => x.permiso).filter(Boolean))];

  return { ...user, roles, permissions };
}

export async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success:false, message:'No autorizado. Inicia sesión.' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
  } catch {
    return res.status(401).json({ success:false, message:'Sesión inválida o expirada.' });
  }

  try {
    req.user = await refreshAccess(decoded);
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requirePermission(modulo, accion='lectura') {
  const clave = `${modulo}.${accion}`;
  return (req,res,next) => {
    const roles = req.user?.roles || [];
    const permisos = req.user?.permissions || [];
    if (roles.includes('administrador') || permisos.includes('*') || permisos.includes(clave)) return next();
    return res.status(403).json({ success:false, message:'No tienes permiso para realizar esta acción.' });
  };
}

export function requireRole(...allowed) {
  return (req,res,next) => {
    const roles = req.user?.roles || [];
    if (roles.includes('administrador') || allowed.some((r) => roles.includes(r))) return next();
    return res.status(403).json({ success:false, message:'Tu rol no tiene acceso a esta opción.' });
  };
}
