import { app } from './app.js';
import { pool } from './db.js';
const server = app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () =>
  console.log(`ClassAssist API listening on port ${process.env.PORT || 3001}`),
);
const stop = () =>
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
