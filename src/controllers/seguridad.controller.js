import * as M from '../models/seguridad.model.js';


function withValidCvu(body = {}, extra = {}) {
  const cvu = String(body.cvu_rizoma ?? '').trim();
  if (cvu && !/^\d{7}$/.test(cvu)) {
    const error = new Error('El CVU Rizoma debe contener exactamente 7 dígitos.');
    error.statusCode = 400;
    throw error;
  }
  return { ...body, cvu_rizoma: cvu || null, ...extra };
}

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
export const createUser = wrap((req) => M.createUser(withValidCvu(req.body, { aprobado_por: req.user?.usuario })), 201);
export const updateUser = wrap((req) => M.updateUser(+req.params.id, withValidCvu(req.body, { aprobado_por: req.user?.usuario })));
export const removeUser = wrap((req) => M.removeUser(+req.params.id));
