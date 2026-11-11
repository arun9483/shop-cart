import express, { type Express, type RequestHandler } from 'express';
import {
  devBypassHeader,
  healthRouter,
  meHandler,
  notFound,
  problemHandler,
  traceResponse,
  type VersionInfo,
} from '@shop-cart/server-common';

const items = [
  { productId: 'mug', name: 'Stoneware mug', price: 349, quantity: 2 },
  { productId: 'kettle', name: 'Steel kettle', price: 1499, quantity: 1 },
];

/**
 * Stand-in for the Cart backend service. Dev only; never deployed. With `requireUser` (MVP-2,
 * `AUTH_ENABLED=true`, or the development bypass), every route but health and version needs a
 * logged-in user with a Cart role.
 */
export function createApp(
  version: VersionInfo,
  requireUser?: RequestHandler,
  devBypass = false,
): Express {
  const app = express();
  app.disable('x-powered-by');
  if (devBypass) app.use(devBypassHeader);
  app.use(healthRouter({ version }));
  app.use(traceResponse);
  if (requireUser) {
    app.use(requireUser);
    app.get('/me', meHandler);
  }

  app.get('/cart', (_req, res) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ items, total });
  });

  app.get('/test-error', () => {
    throw new Error('Cart mock backend test error');
  });

  app.use(notFound);
  app.use(problemHandler);
  return app;
}
