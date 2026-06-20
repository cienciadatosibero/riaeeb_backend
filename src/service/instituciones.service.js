import * as M from '../models/instituciones.model.js';
export const listar = () => M.findAll();
export const crear = (d) => M.create(d);
export const actualizar = (id, d) => M.update(id, d);
export const eliminar = (id) => M.remove(id);
