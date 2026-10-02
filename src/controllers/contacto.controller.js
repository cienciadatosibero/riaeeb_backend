import * as service from '../service/contacto.service.js';
import * as M from '../models/contacto.model.js';

const nombreUsuario=(req)=>
  req.user?.nombre_completo ||
  req.user?.usuario ||
  `Usuario ${req.user?.id||''}`.trim();

export async function create(req,res,next){
  try{
    const data=await service.registrar(req.body);
    res.status(201).json({
      success:true,
      data:{...data,mensaje:'Tu mensaje fue recibido. Gracias por escribirnos.'}
    });
  }catch(err){
    next(err);
  }
}

export async function listAdmin(req,res,next){
  try{
    res.json({success:true,data:await M.listAll()});
  }catch(e){
    next(e);
  }
}

export async function mark(req,res,next){
  try{
    res.json({
      success:true,
      data:await M.mark(+req.params.id,req.body.leido!==false)
    });
  }catch(e){
    next(e);
  }
}

export async function saveReply(req,res,next){
  try{
    const respuesta=String(req.body?.respuesta||'').trim();

    if(!respuesta){
      return res.status(400).json({
        success:false,
        message:'Escribe una respuesta antes de guardar.'
      });
    }

    if(respuesta.length>10000){
      return res.status(400).json({
        success:false,
        message:'La respuesta es demasiado extensa.'
      });
    }

    const actual=await M.findById(+req.params.id);
    if(!actual){
      return res.status(404).json({
        success:false,
        message:'Mensaje no encontrado.'
      });
    }

    res.json({
      success:true,
      data:await M.saveDraft(
        +req.params.id,
        respuesta,
        nombreUsuario(req)
      )
    });
  }catch(e){
    next(e);
  }
}

export async function markResponded(req,res,next){
  try{
    const id=+req.params.id;
    const respuesta=String(req.body?.respuesta||'').trim();

    if(!respuesta){
      return res.status(400).json({
        success:false,
        message:'Guarda la respuesta antes de marcar el mensaje como respondido.'
      });
    }

    if(respuesta.length>10000){
      return res.status(400).json({
        success:false,
        message:'La respuesta es demasiado extensa.'
      });
    }

    const actual=await M.findById(id);
    if(!actual){
      return res.status(404).json({
        success:false,
        message:'Mensaje no encontrado.'
      });
    }

    const data=await M.markResponded(
      id,
      respuesta,
      nombreUsuario(req)
    );

    res.json({
      success:true,
      data
    });
  }catch(e){
    next(e);
  }
}

export async function remove(req,res,next){
  try{
    res.json({
      success:true,
      data:await M.remove(+req.params.id)
    });
  }catch(e){
    next(e);
  }
}
