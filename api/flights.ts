import type { IncomingMessage, ServerResponse } from 'node:http';
import { createFlightsProxyMiddleware } from '../server/flightsProxyHandler.ts';

const middleware = createFlightsProxyMiddleware();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await middleware(req, res);
}
