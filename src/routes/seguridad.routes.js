import { Router } from 'express';
import * as c from '../controllers/seguridad.controller.js';
import { auth, requirePermission } from '../middlewares/auth.js';

const r = Router();
r.use(auth);

r.get('/modulos', requirePermission('seguridad_modulos','lectura'), c.listModules);
r.post('/modulos', requirePermission('seguridad_modulos','escritura'), c.createModule);
r.put('/modulos/:id', requirePermission('seguridad_modulos','actualizar'), c.updateModule);
r.delete('/modulos/:id', requirePermission('seguridad_modulos','eliminar'), c.removeModule);

r.get('/permisos', requirePermission('seguridad_permisos','lectura'), c.listPermissions);
r.post('/permisos', requirePermission('seguridad_permisos','escritura'), c.createPermission);
r.put('/permisos/:id', requirePermission('seguridad_permisos','actualizar'), c.updatePermission);
r.delete('/permisos/:id', requirePermission('seguridad_permisos','eliminar'), c.removePermission);

r.get('/roles', requirePermission('seguridad_roles','lectura'), c.listRoles);
r.post('/roles', requirePermission('seguridad_roles','escritura'), c.createRole);
r.put('/roles/:id', requirePermission('seguridad_roles','actualizar'), c.updateRole);
r.delete('/roles/:id', requirePermission('seguridad_roles','eliminar'), c.removeRole);

r.get('/usuarios', requirePermission('seguridad_usuarios','lectura'), c.listUsers);
r.post('/usuarios', requirePermission('seguridad_usuarios','escritura'), c.createUser);
r.put('/usuarios/:id', requirePermission('seguridad_usuarios','actualizar'), c.updateUser);
r.delete('/usuarios/:id', requirePermission('seguridad_usuarios','eliminar'), c.removeUser);

export default r;
