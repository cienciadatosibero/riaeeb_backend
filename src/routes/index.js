// backend/src/routes/index.js
import { Router } from 'express';
import auth from './auth.routes.js';
import uploads from './upload.routes.js';
import investigadores from './investigadores.routes.js';
import investigaciones from './investigaciones.routes.js';
import noticias from './noticias.routes.js';
import contacto from './contacto.routes.js';
import instituciones from './instituciones.routes.js';
import about from './about.routes.js';

const router = Router();
router.use('/auth', auth);
router.use('/upload', uploads);
router.use('/investigadores', investigadores);
router.use('/investigaciones', investigaciones);
router.use('/noticias', noticias);
router.use('/contacto', contacto);
router.use('/instituciones', instituciones);
router.use('/about', about);
export default router;
