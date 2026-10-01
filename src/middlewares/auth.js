import 'dotenv/config';
import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success:false, message:'No autorizado. Inicia sesión.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    next();
  } catch {
    return res.status(401).json({ success:false, message:'Sesión inválida o expirada.' });
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
