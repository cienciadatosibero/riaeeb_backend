import { Router } from 'express';
import { registrar } from '../controllers/registro.controller.js';
const r = Router();
r.post('/', registrar);
export default r;
