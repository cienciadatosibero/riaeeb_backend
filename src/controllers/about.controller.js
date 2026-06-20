import * as s from '../service/about.service.js';
export const get = async (req,res,next)=>{try{res.json({success:true,data:await s.obtener()});}catch(e){next(e);}};
export const save = async (req,res,next)=>{try{res.json({success:true,data:await s.guardar(req.body)});}catch(e){next(e);}};
