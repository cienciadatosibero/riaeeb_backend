import * as M from '../models/seguridad.model.js';

const wrap = (fn, status=200) => async (req,res,next) => {
  try { res.status(status).json({ success:true, data: await fn(req,res) }); }
  catch (e) { next(e); }
};

export const listModules = wrap(() => M.listModules());
export const createModule = wrap((req) => M.createModule(req.body), 201);
export const updateModule = wrap((req) => M.updateModule(+req.params.id, req.body));
export const removeModule = wrap((req) => M.removeModule(+req.params.id));

export const listPermissions = wrap(() => M.listPermissions());
export const createPermission = wrap((req) => M.createPermission(req.body), 201);
export const updatePermission = wrap((req) => M.updatePermission(+req.params.id, req.body));
export const removePermission = wrap((req) => M.removePermission(+req.params.id));

export const listRoles = wrap(() => M.listRoles());
export const createRole = wrap((req) => M.createRole(req.body), 201);
export const updateRole = wrap((req) => M.updateRole(+req.params.id, req.body));
export const removeRole = wrap((req) => M.removeRole(+req.params.id));

export const listUsers = wrap(() => M.listUsers());
export const createUser = wrap((req) => M.createUser({ ...req.body, aprobado_por: req.user?.usuario }), 201);
export const updateUser = wrap((req) => M.updateUser(+req.params.id, { ...req.body, aprobado_por: req.user?.usuario }));
export const removeUser = wrap((req) => M.removeUser(+req.params.id));
