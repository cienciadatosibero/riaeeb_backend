// backend/src/controllers/upload.controller.js
export function subir(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' });
  }
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url, filename: req.file.filename } });
}
