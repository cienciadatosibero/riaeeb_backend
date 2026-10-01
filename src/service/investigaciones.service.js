import * as M from '../models/investigaciones.model.js';
export const listar = () => M.findAll();
export const listarUsuario = (u) => M.findForUser(u);
export const crear = (d,u) => M.create(d,u);
export const actualizar = (id,d,u) => M.update(id,d,u);
export const eliminar = (id,u) => M.remove(id,u);
export const participar = (id,u) => M.participate(id,u);
export const salir = (id,u) => M.leave(id,u);
