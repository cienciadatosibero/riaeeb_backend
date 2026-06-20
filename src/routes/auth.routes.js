// backend/src/routes/auth.routes.js
import { Router } from 'express';
import { login, me } from '../controllers/auth.controller.js';
import { auth } from '../middlewares/auth.js';

const router = Router();
router.post('/login', login);
router.get('/me', auth, me);
export default router;
