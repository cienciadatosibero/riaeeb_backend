// backend/src/routes/servicios.routes.js
import { Router } from 'express';
import * as ctrl from '../controllers/servicios.controller.js';

const router = Router();

router.get('/', ctrl.getAll);

export default router;
