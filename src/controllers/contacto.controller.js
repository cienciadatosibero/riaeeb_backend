import * as service from '../service/contacto.service.js';
import * as M from '../models/contacto.model.js';

export async function create(req,res,next){try{const data=await service.registrar(req.body);res.status(201).json({success:true,data:{...data,mensaje:'Tu mensaje fue recibido. Gracias por escribirnos.'}});}catch(err){next(err);}}
export async function listAdmin(req,res,next){try{res.json({success:true,data:await M.listAll()});}catch(e){next(e);}}
export async function mark(req,res,next){try{res.json({success:true,data:await M.mark(+req.params.id,req.body.leido!==false)});}catch(e){next(e);}}
export async function remove(req,res,next){try{res.json({success:true,data:await M.remove(+req.params.id)});}catch(e){next(e);}}
