import { Router } from 'express';
import * as c from '../controllers/investigadores.controller.js';
import { auth, requirePermission } from '../middlewares/auth.js';
const r = Router();
r.get('/', c.getAll);
r.post('/', auth, requirePermission('seguridad_usuarios','escritura'), c.create);
r.put('/:id', auth, requirePermission('seguridad_usuarios','actualizar'), c.update);
r.delete('/:id', auth, requirePermission('seguridad_usuarios','eliminar'), c.remove);
export default r;
