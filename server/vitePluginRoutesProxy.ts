import { loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';
import { createRoutesProxyMiddleware } from './routesProxyHandler.ts';

export function routesProxyPlugin(): Plugin {
  let loadedApiKey: string | undefined;

  return {
    name: 'ryoko-routes-proxy',
    config(_config, { mode }) {
      // Securely load all env variables (including non-VITE_ server secrets) for current mode
      const env = loadEnv(mode, process.cwd(), '');
      loadedApiKey = env.GOOGLE_ROUTES_API_KEY || env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
      if (loadedApiKey && !process.env.GOOGLE_ROUTES_API_KEY) {
        process.env.GOOGLE_ROUTES_API_KEY = loadedApiKey;
      }
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/api/routes',
        createRoutesProxyMiddleware({ apiKey: loadedApiKey || process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY })
      );
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(
        '/api/routes',
        createRoutesProxyMiddleware({ apiKey: loadedApiKey || process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY })
      );
    },
  };
}
