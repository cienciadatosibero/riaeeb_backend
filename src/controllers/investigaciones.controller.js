import * as s from '../service/investigaciones.service.js';
export const getAll = async (req,res,next)=>{try{res.json({success:true,data:await s.listar()});}catch(e){next(e);}};
export const getAdmin = async (req,res,next)=>{try{res.json({success:true,data:await s.listarUsuario(req.user)});}catch(e){next(e);}};
export const create = async (req,res,next)=>{try{res.status(201).json({success:true,data:await s.crear(req.body,req.user)});}catch(e){next(e);}};
export const update = async (req,res,next)=>{try{res.json({success:true,data:await s.actualizar(+req.params.id,req.body,req.user)});}catch(e){next(e);}};
export const remove = async (req,res,next)=>{try{res.json({success:true,data:await s.eliminar(+req.params.id,req.user)});}catch(e){next(e);}};
export const participate = async (req,res,next)=>{try{res.json({success:true,data:await s.participar(+req.params.id,req.user)});}catch(e){next(e);}};
export const leave = async (req,res,next)=>{try{res.json({success:true,data:await s.salir(+req.params.id,req.user)});}catch(e){next(e);}};
