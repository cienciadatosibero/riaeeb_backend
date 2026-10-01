import * as M from '../models/portada.model.js';
export async function get(req,res,next){try{res.json({success:true,data:await M.get()});}catch(e){next(e);}}
export async function save(req,res,next){try{res.json({success:true,data:await M.save(req.body||{})});}catch(e){next(e);}}
