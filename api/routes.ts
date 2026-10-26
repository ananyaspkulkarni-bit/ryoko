import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRoutesProxyMiddleware } from '../server/routesProxyHandler.ts';

const middleware = createRoutesProxyMiddleware();

/**
 * Serverless API route for /api/routes.
 * Suitable for Vercel, Netlify Functions, or Node server environments.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await middleware(req, res);
}
