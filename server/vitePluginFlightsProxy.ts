import { loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';
import { createFlightsProxyMiddleware } from './flightsProxyHandler.ts';

export function flightsProxyPlugin(): Plugin {
  let loadedClientId: string | undefined;
  let loadedClientSecret: string | undefined;

  return {
    name: 'ryoko-flights-proxy',
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), '');
      loadedClientId = env.AMADEUS_CLIENT_ID || process.env.AMADEUS_CLIENT_ID;
      loadedClientSecret = env.AMADEUS_CLIENT_SECRET || process.env.AMADEUS_CLIENT_SECRET;
      if (loadedClientId && !process.env.AMADEUS_CLIENT_ID) {
        process.env.AMADEUS_CLIENT_ID = loadedClientId;
      }
      if (loadedClientSecret && !process.env.AMADEUS_CLIENT_SECRET) {
        process.env.AMADEUS_CLIENT_SECRET = loadedClientSecret;
      }
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/api/flights',
        createFlightsProxyMiddleware({
          clientId: loadedClientId || process.env.AMADEUS_CLIENT_ID,
          clientSecret: loadedClientSecret || process.env.AMADEUS_CLIENT_SECRET,
        })
      );
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(
        '/api/flights',
        createFlightsProxyMiddleware({
          clientId: loadedClientId || process.env.AMADEUS_CLIENT_ID,
          clientSecret: loadedClientSecret || process.env.AMADEUS_CLIENT_SECRET,
        })
      );
    },
  };
}
