import { Router } from 'express';
import { auth, requirePermission } from '../middlewares/auth.js';
import { resumen } from '../controllers/dashboard.controller.js';
const r = Router();
r.get('/', auth, requirePermission('dashboard','lectura'), resumen);
export default r;
