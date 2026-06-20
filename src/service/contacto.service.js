// backend/src/service/contacto.service.js
import * as Contacto from '../models/contacto.model.js';

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registrar(data) {
  const errores = [];
  const nombre = (data.nombre || '').trim();
  const correo = (data.correo || '').trim();
  const asunto = (data.asunto || '').trim();
  const mensaje = (data.mensaje || '').trim();

  if (nombre.length < 2) errores.push('El nombre es obligatorio.');
  if (!RE_CORREO.test(correo)) errores.push('El correo no es válido.');
  if (asunto.length < 3) errores.push('El asunto es obligatorio.');
  if (mensaje.length < 10) errores.push('El mensaje debe tener al menos 10 caracteres.');

  if (errores.length) {
    const err = new Error(errores.join(' '));
    err.statusCode = 400;
    throw err;
  }

  return Contacto.create({ nombre, correo, telefono: data.telefono, asunto, mensaje });
}
