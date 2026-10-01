import pool from '../config/db.js';

function tableFor(tipo) {
  if (tipo === 'areas') return { table:'areas_conocimiento', permiso:'areas_conocimiento' };
  if (tipo === 'tipos') return { table:'tipos_investigacion', permiso:'tipos_investigacion' };
  throw new Error('Catálogo no válido.');
}

export const listar = (tipo) => async (req,res,next) => {
  try {
    const { table } = tableFor(tipo);
    const [rows] = await pool.query(`SELECT id,nombre,descripcion,activo FROM ${table} WHERE activo=1 ORDER BY nombre`);
    res.json({ success:true, data:rows });
  } catch (e) { next(e); }
};

export const listarAdmin = (tipo) => async (req,res,next) => {
  try {
    const { table } = tableFor(tipo);
    const [rows] = await pool.query(`SELECT id,nombre,descripcion,activo FROM ${table} ORDER BY nombre`);
    res.json({ success:true, data:rows });
  } catch (e) { next(e); }
};

export const crear = (tipo) => async (req,res,next) => {
  try {
    const { table } = tableFor(tipo);
    const [r] = await pool.query(`INSERT INTO ${table} (nombre,descripcion,activo) VALUES (?,?,?)`,
      [req.body.nombre, req.body.descripcion || null, req.body.activo === false ? 0 : 1]);
    res.status(201).json({ success:true, data:{ id:r.insertId, ...req.body } });
  } catch (e) { next(e); }
};

export const actualizar = (tipo) => async (req,res,next) => {
  try {
    const { table } = tableFor(tipo);
    await pool.query(`UPDATE ${table} SET nombre=?,descripcion=?,activo=? WHERE id=?`,
      [req.body.nombre, req.body.descripcion || null, req.body.activo === false ? 0 : 1, +req.params.id]);
    res.json({ success:true, data:{ id:+req.params.id, ...req.body } });
  } catch (e) { next(e); }
};

export const eliminar = (tipo) => async (req,res,next) => {
  try {
    const { table } = tableFor(tipo);
    await pool.query(`UPDATE ${table} SET activo=0 WHERE id=?`, [+req.params.id]);
    res.json({ success:true, data:{ id:+req.params.id } });
  } catch (e) { next(e); }
};
