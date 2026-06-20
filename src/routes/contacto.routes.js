// backend/src/routes/contacto.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/contacto.controller.js';

const router = Router();
router.post('/', ctrl.create);
export default router;
