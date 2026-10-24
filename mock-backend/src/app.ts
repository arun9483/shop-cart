import express, { type Express } from 'express';
import {
  healthRouter,
  notFound,
  problemHandler,
  traceResponse,
  type VersionInfo,
} from '@shop-cart/server-common';

const items = [
  { productId: 'mug', name: 'Stoneware mug', price: 349, quantity: 2 },
  { productId: 'kettle', name: 'Steel kettle', price: 1499, quantity: 1 },
];

/** Stand-in for the Cart backend service. Dev only; never deployed. */
export function createApp(version: VersionInfo): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(healthRouter({ version }));
  app.use(traceResponse);

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
