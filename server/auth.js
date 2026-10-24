import { betterAuth } from 'better-auth';
import { pool } from './db.js';

const PORT = Number(process.env.PORT) || 3000;

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${PORT}`,
  trustedOrigins: (process.env.TRUSTED_ORIGINS || `http://localhost:${PORT}`)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  emailAndPassword: { enabled: true },
});
