import { Router } from 'express';
import * as c from '../controllers/about.controller.js';
import { auth, requirePermission } from '../middlewares/auth.js';
const r = Router();
r.get('/', c.get);
r.put('/', auth, requirePermission('about','actualizar'), c.save);
export default r;
