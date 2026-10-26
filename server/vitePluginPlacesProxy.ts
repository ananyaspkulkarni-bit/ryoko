import { loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';
import { createPlacesProxyMiddleware } from './placesProxyHandler.ts';

export function placesProxyPlugin(): Plugin {
  let loadedApiKey: string | undefined;

  return {
    name: 'ryoko-places-proxy',
    config(_config, { mode }) {
      // Securely load all env variables (including non-VITE_ server secrets) for current mode
      const env = loadEnv(mode, process.cwd(), '');
      loadedApiKey = env.OPENTRIPMAP_API_KEY || process.env.OPENTRIPMAP_API_KEY;
      if (loadedApiKey && !process.env.OPENTRIPMAP_API_KEY) {
        process.env.OPENTRIPMAP_API_KEY = loadedApiKey;
      }
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/api/places',
        createPlacesProxyMiddleware({ apiKey: loadedApiKey || process.env.OPENTRIPMAP_API_KEY })
      );
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(
        '/api/places',
        createPlacesProxyMiddleware({ apiKey: loadedApiKey || process.env.OPENTRIPMAP_API_KEY })
      );
    },
  };
}
