import { Router } from 'express';
import { auth, requirePermission } from '../middlewares/auth.js';
import * as c from '../controllers/perfil.controller.js';
const r = Router();
r.get('/me', auth, requirePermission('perfil','lectura'), c.getMine);
r.put('/me', auth, requirePermission('perfil','actualizar'), c.updateMine);
export default r;
