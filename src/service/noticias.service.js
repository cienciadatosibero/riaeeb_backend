import * as M from '../models/noticias.model.js';
export const listar = () => M.findAll();
export async function obtener(id) {
  const n = await M.findById(id);
  if (!n) { const e = new Error('La noticia no existe.'); e.statusCode = 404; throw e; }
  return n;
}
export const crear = (d) => M.create(d);
export const actualizar = (id, d) => M.update(id, d);
export const eliminar = (id) => M.remove(id);
