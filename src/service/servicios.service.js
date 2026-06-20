// backend/src/service/servicios.service.js
import * as Servicios from '../models/servicios.model.js';

export const listar = () => Servicios.findAll();
