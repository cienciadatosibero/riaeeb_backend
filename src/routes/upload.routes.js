// backend/src/routes/upload.routes.js
import { Router } from 'express';
import { upload } from '../config/upload.js';
import { auth } from '../middlewares/auth.js';
import { subir, verArchivo } from '../controllers/upload.controller.js';

const router = Router();

// Las imágenes deben poder mostrarse tanto en la administración como
// en la parte pública, por eso esta lectura no requiere autenticación.
router.get('/archivo/:id', verArchivo);

// Administración.
router.post('/', auth, upload.single('archivo'), subir);

// Registro público pendiente de aprobación.
router.post('/publico', upload.single('archivo'), subir);

export default router;
