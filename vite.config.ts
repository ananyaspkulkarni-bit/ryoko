import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { placesProxyPlugin } from './server/vitePluginPlacesProxy.ts';
import { weatherProxyPlugin } from './server/vitePluginWeatherProxy.ts';
import { routesProxyPlugin } from './server/vitePluginRoutesProxy.ts';
import { flightsProxyPlugin } from './server/vitePluginFlightsProxy.ts';
import { hotelsProxyPlugin } from './server/vitePluginHotelsProxy.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    placesProxyPlugin(),
    weatherProxyPlugin(),
    routesProxyPlugin(),
    flightsProxyPlugin(),
    hotelsProxyPlugin(),
  ],
});
