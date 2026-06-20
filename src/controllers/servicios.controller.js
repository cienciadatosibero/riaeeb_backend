// backend/src/controllers/servicios.controller.js
import * as service from '../service/servicios.service.js';

export async function getAll(req, res, next) {
  try {
    const data = await service.listar();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
