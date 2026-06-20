// backend/src/controllers/contacto.controller.js
import * as service from '../service/contacto.service.js';

export async function create(req, res, next) {
  try {
    const data = await service.registrar(req.body);
    res.status(201).json({
      success: true,
      data: { ...data, mensaje: 'Tu mensaje fue recibido. Gracias por escribirnos.' },
    });
  } catch (err) { next(err); }
}
