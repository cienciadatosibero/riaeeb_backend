// backend/src/middlewares/auth.js
import 'dotenv/config';
import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No autorizado. Inicia sesión.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Sesión inválida o expirada.' });
  }
}
