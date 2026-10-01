import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const normalizar = (v) => String(v ?? '').trim().toLowerCase();

async function refreshAccess(user) {
  if (!user?.id) return user;

  const [rows] = await pool.query(
    `SELECT DISTINCT
       LOWER(TRIM(r.clave)) AS rol,
       CASE
         WHEN p.id IS NULL OR m.id IS NULL THEN NULL
         ELSE CONCAT(LOWER(TRIM(m.clave)), '.', LOWER(TRIM(p.accion)))
       END AS permiso
     FROM usuario_roles ur
     JOIN seguridad_roles r
       ON r.id = ur.rol_id
      AND r.activo = 1
     LEFT JOIN seguridad_rol_permisos rp
       ON rp.rol_id = r.id
     LEFT JOIN seguridad_permisos p
       ON p.id = rp.permiso_id
      AND p.activo = 1
     LEFT JOIN seguridad_modulos m
       ON m.id = p.modulo_id
      AND m.activo = 1
     WHERE ur.usuario_id = ?`,
    [user.id]
  );

  const roles = [...new Set(rows.map((x) => normalizar(x.rol)).filter(Boolean))];
  const permissions = [...new Set(rows.map((x) => normalizar(x.permiso)).filter(Boolean))];

  if (roles.includes('administrador') && !permissions.includes('*')) {
    permissions.push('*');
  }

  return { ...user, roles, permissions };
}

export async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado. Inicia sesión.'
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Sesión inválida o expirada.'
    });
  }

  try {
    // IMPORTANTE:
    // Nunca confiar en los permisos guardados dentro del JWT para autorizar.
    // Se vuelven a consultar desde TiDB en CADA petición.
    req.user = await refreshAccess(decoded);
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requirePermission(modulo, accion = 'lectura') {
  const clave = `${normalizar(modulo)}.${normalizar(accion)}`;

  return (req, res, next) => {
    const roles = (req.user?.roles || []).map(normalizar);
    const permisos = (req.user?.permissions || []).map(normalizar);

    if (
      roles.includes('administrador') ||
      permisos.includes('*') ||
      permisos.includes(clave)
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'No tienes permiso para realizar esta acción.',
      required_permission: clave
    });
  };
}

export function requireRole(...allowed) {
  const permitidos = allowed.map(normalizar);

  return (req, res, next) => {
    const roles = (req.user?.roles || []).map(normalizar);

    if (
      roles.includes('administrador') ||
      permitidos.some((r) => roles.includes(r))
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Tu rol no tiene acceso a esta opción.'
    });
  };
}
