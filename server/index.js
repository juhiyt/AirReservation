// Single process serving both the API (/api/*) and the React app.
//   Development (`npm run dev`):  Vite runs inside Express as middleware, with hot reload.
//   Production  (`npm start`):    Express serves the pre-built files in dist/.
import path from 'node:path';

// Load .env for local development; on a host, set real environment variables instead.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '..', '.env'));
} catch {
  // No .env file: rely on the environment.
}

const { default: express } = await import('express');
const { toNodeHandler } = await import('better-auth/node');
const { auth } = await import('./auth.js');
const { api } = await import('./api.js');
const { initDatabase } = await import('./db.js');

await initDatabase();

const isDev = process.argv.includes('--dev');
const PORT = Number(process.env.PORT) || 3000;
const root = path.resolve(import.meta.dirname, '..');

const app = express();
app.disable('x-powered-by');

// Better Auth reads the raw request body itself, so its handler must see the
// request before express.json() (mounted inside the /api router) can consume
// the stream — otherwise sign-up/sign-in silently get an empty body.
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use('/api', api);

if (isDev) {
  const { createServer } = await import('vite'); // dev-only dependency
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  const dist = path.join(root, 'dist');
  // Vite's hashed bundles never change, so they can be cached forever.
  app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(dist, { index: false }));
  // Client-side routes all get index.html. Requests for missing files (anything
  // with an extension) get a real 404 rather than HTML.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || path.extname(req.path)) return next();
    res.sendFile(path.join(dist, 'index.html'), { maxAge: 0 });
  });
}

app.listen(PORT, () => {
  console.log(`${isDev ? '(dev) ' : ''}running at http://localhost:${PORT}`);
});
