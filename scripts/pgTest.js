import pool, { initPostgres } from '../config/postgres.js';

try {
  const res = await pool.query('SELECT NOW() AS time');
  console.log('Postgres says:', res.rows[0].time);
  await initPostgres();
} catch (err) {
  console.error('Postgres error:', err.message);
}
await pool.end();