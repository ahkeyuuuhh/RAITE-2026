import { tick } from './jobs.js';
import { pool } from './db.js';
let running = true;
process.on('SIGTERM', () => {
  running = false;
});
process.on('SIGINT', () => {
  running = false;
});
console.log('ClassAssist publication worker started.');
while (running) {
  try {
    await tick();
  } catch (e) {
    console.error('Worker database unavailable:', e.code || e.name);
  }
  if (running) await new Promise((r) => setTimeout(r, 3000));
}
await pool.end();
