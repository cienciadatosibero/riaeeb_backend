// backend/src/middlewares/errorHandler.js
export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Recurso no encontrado.' });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Ocurrió un error en el servidor.',
  });
}
