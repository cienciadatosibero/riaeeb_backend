// backend/src/routes/upload.routes.js
import { Router } from 'express';
import { upload } from '../config/upload.js';
import { auth } from '../middlewares/auth.js';
import { subir } from '../controllers/upload.controller.js';

const router = Router();
router.post('/', auth, upload.single('archivo'), subir);
export default router;
