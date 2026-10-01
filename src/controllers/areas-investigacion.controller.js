import pool from '../config/db.js';

let lista=false;
async function ensure(){
  if(lista)return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS areas_investigacion (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(160) NOT NULL UNIQUE,
      descripcion VARCHAR(400) NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  const [[c]]=await pool.query(`SELECT COUNT(*) total FROM areas_investigacion`);
  if(Number(c?.total||0)===0){
    await pool.query(`INSERT INTO areas_investigacion (nombre,descripcion,activo) VALUES
      ('Inteligencia artificial','Investigación y aplicaciones de inteligencia artificial',1),
      ('Salud y bienestar','Tecnología aplicada a salud y bienestar',1),
      ('Robótica','Robótica, automatización y sistemas autónomos',1),
      ('Ciencia de datos','Analítica, datos abiertos y ciencia de datos',1)`);
  }
  lista=true;
}

export async function listPublic(req,res,next){try{await ensure();const [rows]=await pool.query(`SELECT id,nombre,descripcion,activo FROM areas_investigacion WHERE activo=1 ORDER BY nombre`);res.json({success:true,data:rows});}catch(e){next(e);}}
export async function listAdmin(req,res,next){try{await ensure();const [rows]=await pool.query(`SELECT id,nombre,descripcion,activo FROM areas_investigacion ORDER BY nombre`);res.json({success:true,data:rows});}catch(e){next(e);}}
export async function create(req,res,next){try{await ensure();const [r]=await pool.query(`INSERT INTO areas_investigacion (nombre,descripcion,activo) VALUES (?,?,?)`,[req.body.nombre,req.body.descripcion||null,req.body.activo===false?0:1]);res.status(201).json({success:true,data:{id:r.insertId,...req.body}});}catch(e){next(e);}}
export async function update(req,res,next){try{await ensure();await pool.query(`UPDATE areas_investigacion SET nombre=?,descripcion=?,activo=? WHERE id=?`,[req.body.nombre,req.body.descripcion||null,req.body.activo===false?0:1,+req.params.id]);res.json({success:true,data:{id:+req.params.id,...req.body}});}catch(e){next(e);}}
export async function remove(req,res,next){try{await ensure();await pool.query(`UPDATE areas_investigacion SET activo=0 WHERE id=?`,[+req.params.id]);res.json({success:true,data:{id:+req.params.id}});}catch(e){next(e);}}
