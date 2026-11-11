import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { RequestHandler } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

describe('login (MVP-2)', () => {
  const version = { name: 'mock-backend', version: '0.1.0', commit: 'test', buildTime: 'now' };

  it('answers /me for a logged-in user, and refuses others, but never health', async () => {
    const user = {
      sub: 'u1',
      sid: 's1',
      user: { sub: 'u1', preferred_username: 'alice', enabled: true },
      roles: ['r'],
    };
    let allow = true;
    const requireUser: RequestHandler = (_req, res, next) => {
      if (!allow) {
        res.status(401).end();
        return;
      }
      res.locals.user = user;
      next();
    };
    const app = createApp(version, requireUser);
    expect((await request(app).get('/me')).body).toEqual({
      sub: 'u1',
      preferred_username: 'alice',
      roles: ['r'],
    });
    allow = false;
    expect((await request(app).get('/me')).status).toBe(401);
    expect((await request(app).get('/health/ready')).status).toBe(200);
  });
});

describe('names and prices from Catalog (MVP-2, ADR 0005)', () => {
  const version = { name: 'mock-backend', version: '0.1.0', commit: 'test', buildTime: 'now' };
  const loggedIn: RequestHandler = (_req, res, next) => {
    res.locals.user = {
      sub: 'u1',
      sid: 's1',
      user: { sub: 'u1', preferred_username: 'alice', enabled: true },
      roles: ['cart-user'],
    };
    next();
  };
  let catalog: Server;
  let catalogUrl: string;
  let seen: { authorization?: string | undefined; user?: string | undefined } = {};

  beforeAll(async () => {
    const fake = express();
    fake.get('/service/products', (req, res) => {
      seen = { authorization: req.get('authorization'), user: req.get('x-shop-user-sub') };
      res.json([
        { id: 'mug', name: 'Mug from Catalog', price: 400 },
        { id: 'kettle', name: 'Kettle from Catalog', price: 1500 },
      ]);
    });
    catalog = fake.listen(0);
    await new Promise((resolve) => catalog.once('listening', resolve));
    catalogUrl = `http://localhost:${(catalog.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    catalog.close();
  });

  const source = (url: string) => ({
    url,
    headers: () => Promise.resolve({ Authorization: 'Bearer cart-service-token' }),
    timeoutMs: 1000,
  });

  it("uses Catalog's names and prices, calling with its own token and naming the user", async () => {
    const res = await request(createApp(version, loggedIn, false, source(catalogUrl))).get('/cart');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        { productId: 'mug', name: 'Mug from Catalog', price: 400, quantity: 2 },
        { productId: 'kettle', name: 'Kettle from Catalog', price: 1500, quantity: 1 },
      ],
      total: 2300,
    });
    expect(seen).toEqual({ authorization: 'Bearer cart-service-token', user: 'u1' });
  });

  it('answers 503 when Catalog cannot be reached', async () => {
    const res = await request(
      createApp(version, loggedIn, false, source('http://localhost:1')),
    ).get('/cart');
    expect(res.status).toBe(503);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  });
});
