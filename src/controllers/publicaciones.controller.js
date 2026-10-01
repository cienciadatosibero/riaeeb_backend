import * as M from '../models/publicaciones.model.js';
export const publicList = async (req,res,next)=>{try{res.json({success:true,data:await M.findPublic()});}catch(e){next(e);}};
export const adminList = async (req,res,next)=>{try{res.json({success:true,data:await M.findAdmin(req.user)});}catch(e){next(e);}};
export const create = async (req,res,next)=>{try{res.status(201).json({success:true,data:await M.create(req.body,req.user)});}catch(e){next(e);}};
export const update = async (req,res,next)=>{try{res.json({success:true,data:await M.update(+req.params.id,req.body,req.user)});}catch(e){next(e);}};
export const remove = async (req,res,next)=>{try{res.json({success:true,data:await M.remove(+req.params.id,req.user)});}catch(e){next(e);}};
