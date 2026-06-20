import { Router } from 'express';
import * as c from '../controllers/investigaciones.controller.js';
import { auth } from '../middlewares/auth.js';
const r = Router();
r.get('/', c.getAll);
r.post('/', auth, c.create);
r.put('/:id', auth, c.update);
r.delete('/:id', auth, c.remove);
export default r;
