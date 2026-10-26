import type { IncomingMessage, ServerResponse } from 'node:http';
import { createWeatherProxyMiddleware } from '../server/weatherProxyHandler.ts';

const middleware = createWeatherProxyMiddleware();

/**
 * Serverless API route for /api/weather.
 * Suitable for Vercel, Netlify Functions, or Node server environments.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await middleware(req, res);
}
