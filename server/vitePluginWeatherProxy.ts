import { loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';
import { createWeatherProxyMiddleware } from './weatherProxyHandler.ts';

export function weatherProxyPlugin(): Plugin {
  let loadedApiKey: string | undefined;

  return {
    name: 'ryoko-weather-proxy',
    config(_config, { mode }) {
      // Securely load all env variables (including non-VITE_ server secrets) for current mode
      const env = loadEnv(mode, process.cwd(), '');
      loadedApiKey = env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
      if (loadedApiKey && !process.env.OPENWEATHER_API_KEY) {
        process.env.OPENWEATHER_API_KEY = loadedApiKey;
      }
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/api/weather',
        createWeatherProxyMiddleware({ apiKey: loadedApiKey || process.env.OPENWEATHER_API_KEY })
      );
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(
        '/api/weather',
        createWeatherProxyMiddleware({ apiKey: loadedApiKey || process.env.OPENWEATHER_API_KEY })
      );
    },
  };
}
