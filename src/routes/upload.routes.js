import { Router } from 'express';
import { upload } from '../config/upload.js';
import { auth } from '../middlewares/auth.js';
import { subir } from '../controllers/upload.controller.js';
const router = Router();
router.post('/', auth, upload.single('archivo'), subir);
// Solo imágenes, máximo 5 MB. Se usa durante el registro público pendiente de aprobación.
router.post('/publico', upload.single('archivo'), subir);
export default router;
