import * as M from '../models/about.model.js';
export const obtener = () => M.get();
export const guardar = (d) => M.upsert(d);
