// backend/server.js
import app from './src/app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API Red IA Equidad escuchando en http://localhost:${PORT}`);
});
