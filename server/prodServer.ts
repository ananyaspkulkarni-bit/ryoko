import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPlacesProxyMiddleware } from './placesProxyHandler.ts';
import { createWeatherProxyMiddleware } from './weatherProxyHandler.ts';
import { createRoutesProxyMiddleware } from './routesProxyHandler.ts';
import { createFlightsProxyMiddleware } from './flightsProxyHandler.ts';
import { createHotelsProxyMiddleware } from './hotelsProxyHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the absolute path to the client build directory (dist).
 */
export function resolveDistDir(): string {
  // Check relative to current file (works for dist-server/prodServer.js -> ../dist)
  const candidateFromMeta = path.resolve(__dirname, '../dist');
  if (fs.existsSync(candidateFromMeta) && fs.existsSync(path.join(candidateFromMeta, 'index.html'))) {
    return candidateFromMeta;
  }

  // Check relative to process.cwd() (works when running from repository root)
  const candidateFromCwd = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(candidateFromCwd) && fs.existsSync(path.join(candidateFromCwd, 'index.html'))) {
    return candidateFromCwd;
  }

  return candidateFromMeta;
}

export const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export interface ProdServerOptions {
  distDir?: string;
  opentripmapApiKey?: string;
  googleMapsApiKey?: string;
  googleRoutesApiKey?: string;
  openweatherApiKey?: string;
  amadeusClientId?: string;
  amadeusClientSecret?: string;
  hotelProviderApiKey?: string;
}

/**
 * Creates the production HTTP request listener for Render.
 */
export function createServer(options: ProdServerOptions = {}): http.Server {
  const distDir = options.distDir || resolveDistDir();

  // Instantiate the 5 verified proxy middlewares with environment credentials
  const placesMiddleware = createPlacesProxyMiddleware({
    apiKey: options.opentripmapApiKey || process.env.OPENTRIPMAP_API_KEY,
  });

  const weatherMiddleware = createWeatherProxyMiddleware({
    apiKey: options.openweatherApiKey || process.env.OPENWEATHER_API_KEY,
  });

  const routesMiddleware = createRoutesProxyMiddleware({
    apiKey:
      options.googleRoutesApiKey ||
      process.env.GOOGLE_ROUTES_API_KEY ||
      options.googleMapsApiKey ||
      process.env.GOOGLE_MAPS_API_KEY,
  });

  const flightsMiddleware = createFlightsProxyMiddleware({
    clientId: options.amadeusClientId || process.env.AMADEUS_CLIENT_ID,
    clientSecret: options.amadeusClientSecret || process.env.AMADEUS_CLIENT_SECRET,
  });

  const hotelsMiddleware = createHotelsProxyMiddleware({
    apiKey: options.hotelProviderApiKey || process.env.HOTEL_PROVIDER_API_KEY,
  });

  return http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || 'localhost';
      const parsedUrl = new URL(req.url || '/', `http://${host}`);
      const pathname = parsedUrl.pathname;

      // ------------------------------------------------------------------------
      // 1. API PROXY ROUTING (/api/*)
      // ------------------------------------------------------------------------
      if (pathname.startsWith('/api/')) {
        const normalized = pathname.replace(/\/+$/, '');

        if (normalized === '/api/places') {
          await placesMiddleware(req, res);
          return;
        }

        if (normalized === '/api/weather') {
          await weatherMiddleware(req, res);
          return;
        }

        if (normalized === '/api/routes') {
          await routesMiddleware(req, res);
          return;
        }

        if (normalized === '/api/flights') {
          await flightsMiddleware(req, res);
          return;
        }

        if (normalized === '/api/hotels') {
          await hotelsMiddleware(req, res);
          return;
        }

        // Return clean JSON error for unknown API endpoints (do NOT serve SPA index.html)
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(
          JSON.stringify({
            error: 'Not Found',
            message: `Unknown API endpoint: ${pathname}`,
          })
        );
        return;
      }

      // ------------------------------------------------------------------------
      // 2. HTTP METHOD GUARD (Only GET and HEAD for static / SPA routes)
      // ------------------------------------------------------------------------
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`Method ${req.method} Not Allowed`);
        return;
      }

      // ------------------------------------------------------------------------
      // 3. STATIC FILE SERVING WITH DIRECTORY TRAVERSAL PROTECTION
      // ------------------------------------------------------------------------
      const decodedPath = decodeURIComponent(pathname);
      const safeRelativePath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
      let candidatePath = path.join(distDir, safeRelativePath);

      // Verify resolved path stays strictly inside distDir
      if (!candidatePath.startsWith(distDir)) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Forbidden');
        return;
      }

      let fileStat: fs.Stats | null = null;
      try {
        fileStat = await fs.promises.stat(candidatePath);
      } catch {
        fileStat = null;
      }

      // If directory requested, check for index.html inside it
      if (fileStat?.isDirectory()) {
        const potentialIndex = path.join(candidatePath, 'index.html');
        try {
          const indexStat = await fs.promises.stat(potentialIndex);
          if (indexStat.isFile()) {
            candidatePath = potentialIndex;
            fileStat = indexStat;
          } else {
            fileStat = null;
          }
        } catch {
          fileStat = null;
        }
      }

      // Serve static asset if found
      if (fileStat?.isFile()) {
        const ext = path.extname(candidatePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileStat.size);

        // Cache control: HTML must revalidate; hashed assets can be cached aggressively
        if (candidatePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else if (candidatePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }

        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        const readStream = fs.createReadStream(candidatePath);
        readStream.pipe(res);
        return;
      }

      // ------------------------------------------------------------------------
      // 4. REACT ROUTER SPA FALLBACK (Serve dist/index.html)
      // ------------------------------------------------------------------------
      const fallbackHtml = path.join(distDir, 'index.html');
      try {
        const fallbackStat = await fs.promises.stat(fallbackHtml);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Length', fallbackStat.size);
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');

        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        const readStream = fs.createReadStream(fallbackHtml);
        readStream.pipe(res);
      } catch {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Application build not found. Run npm run build first.');
      }
    } catch (err) {
      console.error('[Ryoko Production Server] Request error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  });
}

/**
 * Starts listening on the given host and port.
 */
export function startServer(
  port = Number(process.env.PORT) || 3000,
  host = '0.0.0.0',
  options: ProdServerOptions = {}
): http.Server {
  const distDir = options.distDir || resolveDistDir();
  const server = createServer({ ...options, distDir });

  server.listen(port, host, () => {
    console.log(`[Ryoko Production Server] Listening on http://${host}:${port}`);
    console.log(`[Ryoko Production Server] Serving static build from: ${distDir}`);
  });

  return server;
}

// Auto-start server when executed directly (not in test runners)
const isTestEnv = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
if (!isTestEnv) {
  startServer();
}
