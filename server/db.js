// Postgres (Neon) connection pool, schema setup and flight-schedule seeding.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { FLIGHTS } from './catalog.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.');
  process.exit(1);
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

// Neon closes idle connections from its side. Without this listener the resulting
// 'error' event on an idle client is unhandled and crashes the process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client:', err.message);
});

// Run fn(client) inside a transaction; commits on success, rolls back on any throw.
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Create tables if missing and insert any scheduled flights not yet in the
// database. Existing rows are left alone, so seat counts survive restarts and
// redeploys — this must run *after* `npm run auth:migrate` on a fresh database,
// since bookings.user_id has a foreign key to Better Auth's "user" table.
export async function initDatabase() {
  await pool.query(fs.readFileSync(path.join(import.meta.dirname, 'schema.sql'), 'utf8'));

  const cols = [
    'flight_number', 'airline', 'origin', 'origin_city', 'destination', 'destination_city',
    'departure_time', 'arrival_time', 'price', 'seats_total', 'seats_available',
  ];
  const values = [];
  const rows = FLIGHTS.map((f, i) => {
    values.push(
      f.flightNumber, f.airline, f.origin, f.originCity, f.destination, f.destinationCity,
      f.departureTime, f.arrivalTime, f.price, f.seatsTotal, f.seatsTotal,
    );
    return `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(', ')})`;
  });
  const { rowCount } = await pool.query(
    `INSERT INTO flights (${cols.join(', ')}) VALUES ${rows.join(', ')}
     ON CONFLICT (flight_number, departure_time) DO NOTHING`,
    values,
  );
  if (rowCount) console.log(`Seeded ${rowCount} flight(s).`);
}
