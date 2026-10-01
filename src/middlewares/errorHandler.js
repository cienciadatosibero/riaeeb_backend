export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Recurso no encontrado.' });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[API ERROR]', {
    method: req.method,
    path: req.originalUrl,
    code: err?.code,
    errno: err?.errno,
    message: err?.message,
  });

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Ocurrió un error en el servidor.',
    // Sirve para diagnosticar TiDB/Vercel sin publicar SQL ni credenciales.
    ...(err?.code ? { code: err.code } : {}),
  });
}
