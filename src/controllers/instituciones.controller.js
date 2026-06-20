import * as s from '../service/instituciones.service.js';
export const getAll = async (req,res,next)=>{try{res.json({success:true,data:await s.listar()});}catch(e){next(e);}};
export const create = async (req,res,next)=>{try{res.status(201).json({success:true,data:await s.crear(req.body)});}catch(e){next(e);}};
export const update = async (req,res,next)=>{try{res.json({success:true,data:await s.actualizar(+req.params.id,req.body)});}catch(e){next(e);}};
export const remove = async (req,res,next)=>{try{res.json({success:true,data:await s.eliminar(+req.params.id)});}catch(e){next(e);}};
