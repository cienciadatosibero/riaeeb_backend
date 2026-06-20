import { Router } from 'express';
import * as c from '../controllers/about.controller.js';
import { auth } from '../middlewares/auth.js';
const r = Router();
r.get('/', c.get);
r.put('/', auth, c.save);
export default r;
