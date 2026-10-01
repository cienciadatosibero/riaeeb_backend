import * as s from '../service/investigadores.service.js';

function validarCvu(body = {}) {
  const cvu = String(body.cvu_rizoma ?? '').trim();
  if (cvu && !/^\d{7}$/.test(cvu)) {
    const error = new Error('El CVU Rizoma debe contener exactamente 7 dígitos.');
    error.statusCode = 400;
    throw error;
  }
  return { ...body, cvu_rizoma: cvu || null };
}

export const getAll = async (req,res,next)=>{try{res.json({success:true,data:await s.listar()});}catch(e){next(e);}};
export const create = async (req,res,next)=>{try{res.status(201).json({success:true,data:await s.crear(validarCvu(req.body))});}catch(e){next(e);}};
export const update = async (req,res,next)=>{try{res.json({success:true,data:await s.actualizar(+req.params.id,validarCvu(req.body))});}catch(e){next(e);}};
export const remove = async (req,res,next)=>{try{res.json({success:true,data:await s.eliminar(+req.params.id)});}catch(e){next(e);}};
