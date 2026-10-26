import { loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';
import { createHotelsProxyMiddleware } from './hotelsProxyHandler.ts';

export function hotelsProxyPlugin(): Plugin {
  let loadedApiKey: string | undefined;

  return {
    name: 'ryoko-hotels-proxy',
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), '');
      loadedApiKey = env.HOTEL_PROVIDER_API_KEY || env.GOOGLE_HOTELS_API_KEY || process.env.HOTEL_PROVIDER_API_KEY || process.env.GOOGLE_HOTELS_API_KEY;
      if (loadedApiKey && !process.env.HOTEL_PROVIDER_API_KEY) {
        process.env.HOTEL_PROVIDER_API_KEY = loadedApiKey;
      }
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/api/hotels',
        createHotelsProxyMiddleware({
          apiKey: loadedApiKey || process.env.HOTEL_PROVIDER_API_KEY || process.env.GOOGLE_HOTELS_API_KEY,
        })
      );
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(
        '/api/hotels',
        createHotelsProxyMiddleware({
          apiKey: loadedApiKey || process.env.HOTEL_PROVIDER_API_KEY || process.env.GOOGLE_HOTELS_API_KEY,
        })
      );
    },
  };
}
