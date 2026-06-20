// backend/src/controllers/auth.controller.js
import 'dotenv/config';
import jwt from 'jsonwebtoken';

export function login(req, res) {
  const { usuario, password } = req.body || {};
  const U = process.env.ADMIN_USER || 'admin';
  const P = process.env.ADMIN_PASSWORD || 'admin';

  if (usuario === U && password === P) {
    const token = jwt.sign({ usuario }, process.env.JWT_SECRET || 'secreto', { expiresIn: '8h' });
    return res.json({ success: true, data: { token, usuario } });
  }
  return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
}

export function me(req, res) {
  res.json({ success: true, data: { usuario: req.user?.usuario } });
}
