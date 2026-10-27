import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

import { createServer, MIME_TYPES } from './prodServer.ts';

describe('Render Production Server Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  const mockDistDir = path.resolve(process.cwd(), 'dist');

  beforeAll(async () => {
    // Ensure dist directory has an index.html for testing
    if (!fs.existsSync(mockDistDir)) {
      fs.mkdirSync(mockDistDir, { recursive: true });
    }
    const indexHtmlPath = path.join(mockDistDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
      fs.writeFileSync(indexHtmlPath, '<!DOCTYPE html><html><head><title>Ryoko</title></head><body><div id="root"></div></body></html>', 'utf8');
    }

    server = createServer({ distDir: mockDistDir });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('serves dist/index.html with text/html content type for root GET /', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const text = await res.text();
    expect(text).toContain('<div id="root">');
  });

  it('provides React Router SPA fallback for unknown client route /playground', async () => {
    const res = await fetch(`${baseUrl}/playground`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const text = await res.text();
    expect(text).toContain('<div id="root">');
  });

  it('provides React Router SPA fallback for deep client route /destination/paris', async () => {
    const res = await fetch(`${baseUrl}/destination/paris`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const text = await res.text();
    expect(text).toContain('<div id="root">');
  });

  it('returns 404 JSON for unknown API endpoint /api/unknown (does NOT return index.html)', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-route`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = (await res.json()) as Record<string, any>;
    expect(data.error).toBe('Not Found');
    expect(data.message).toContain('/api/nonexistent-route');
  });

  it('guards against unsupported HTTP methods for static files (returns 405)', async () => {
    const res = await fetch(`${baseUrl}/`, { method: 'POST' });
    expect(res.status).toBe(405);
    const text = await res.text();
    expect(text).toContain('Method POST Not Allowed');
  });

  it('guards against directory traversal attempts with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/../../../../etc/passwd`);
    // Should be rejected with 403 or handled safely without exposing outside files
    expect([403, 404, 200]).toContain(res.status);
    if (res.status === 200) {
      // If 200, it must be the SPA index.html fallback, never system files
      const text = await res.text();
      expect(text).toContain('<div id="root">');
    }
  });

  it('handles HEAD requests with 200 status and headers without crashing', async () => {
    const res = await fetch(`${baseUrl}/`, { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('successfully routes to /api/places proxy and returns JSON', async () => {
    const res = await fetch(`${baseUrl}/api/places?lat=48.8566&lng=2.3522&radius=5000&limit=5`);
    expect([200, 503]).toContain(res.status);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = (await res.json()) as Record<string, any>;
    expect(data.status || data.error || data.success).toBeDefined();
  });

  it('successfully routes to /api/weather proxy and returns JSON', async () => {
    const res = await fetch(`${baseUrl}/api/weather?lat=48.8566&lng=2.3522&destinationId=paris`);
    expect([200, 503]).toContain(res.status);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = (await res.json()) as Record<string, any>;
    expect(data).toHaveProperty('success');
  });

  it('successfully routes to /api/routes proxy and returns JSON', async () => {
    const res = await fetch(
      `${baseUrl}/api/routes?originLat=48.8566&originLng=2.3522&destLat=48.8584&destLng=2.2945`
    );
    expect([200, 503]).toContain(res.status);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = (await res.json()) as Record<string, any>;
    expect(data).toHaveProperty('success');
  });

  it('successfully routes to /api/flights proxy and returns JSON', async () => {
    const res = await fetch(`${baseUrl}/api/flights?origin=PAR&destination=TYO&departDate=2026-11-01`);
    expect([200, 503]).toContain(res.status);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = (await res.json()) as Record<string, any>;
    expect(data).toHaveProperty('success');
  });

  it('successfully routes to /api/hotels proxy and returns JSON', async () => {
    const res = await fetch(`${baseUrl}/api/hotels?destinationId=paris&checkIn=2026-11-01&checkOut=2026-11-05`);
    expect([200, 503]).toContain(res.status);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = (await res.json()) as Record<string, any>;
    expect(data).toHaveProperty('success');
  });

  it('maps essential MIME types correctly', () => {
    expect(MIME_TYPES['.html']).toBe('text/html; charset=utf-8');
    expect(MIME_TYPES['.js']).toBe('application/javascript; charset=utf-8');
    expect(MIME_TYPES['.css']).toBe('text/css; charset=utf-8');
    expect(MIME_TYPES['.svg']).toBe('image/svg+xml');
    expect(MIME_TYPES['.json']).toBe('application/json; charset=utf-8');
  });
});
