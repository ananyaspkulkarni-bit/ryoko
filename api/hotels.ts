import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHotelsProxyMiddleware } from '../server/hotelsProxyHandler.ts';

const middleware = createHotelsProxyMiddleware();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await middleware(req, res);
}
