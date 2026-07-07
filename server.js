// backend/server.js
import app from './src/app.js';

const PORT = process.env.PORT || 4000;

// En local levantamos un servidor normal.
// En Vercel (serverless) NO se usa app.listen(): se exporta la app como handler.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API Red IA Equidad escuchando en http://localhost:${PORT}`);
  });
}

export default app;
