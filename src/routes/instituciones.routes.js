import { Router } from 'express';
import * as c from '../controllers/instituciones.controller.js';
import { auth, requirePermission } from '../middlewares/auth.js';
const r = Router();
r.get('/', c.getAll);
r.post('/', auth, requirePermission('instituciones','escritura'), c.create);
r.put('/:id', auth, requirePermission('instituciones','actualizar'), c.update);
r.delete('/:id', auth, requirePermission('instituciones','eliminar'), c.remove);
export default r;
