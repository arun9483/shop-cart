import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const app = createApp({ name: 'mock-backend', version: '0.1.0', commit: 'test', buildTime: 'now' });

describe('cart mock backend', () => {
  it('serves the cart with its total', async () => {
    const res = await request(app).get('/cart');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2197 });
    expect((res.body as { items: unknown[] }).items).toHaveLength(2);
    expect(res.headers.traceresponse).toBeDefined();
  });

  it('throws on /test-error as a problem', async () => {
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  });

  it('is ready', async () => {
    expect((await request(app).get('/health/ready')).status).toBe(200);
  });
});
