import type { IncomingMessage, ServerResponse } from 'node:http';
import { createPlacesProxyMiddleware } from '../server/placesProxyHandler.ts';

const middleware = createPlacesProxyMiddleware();

/**
 * Serverless API route for /api/places.
 * Suitable for Vercel, Netlify Functions, or Node server environments.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await middleware(req, res);
}
