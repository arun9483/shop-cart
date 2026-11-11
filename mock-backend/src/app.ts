import express, { type Express, type RequestHandler } from 'express';
import {
  devBypassHeader,
  HttpError,
  healthRouter,
  meHandler,
  notFound,
  problemHandler,
  traceResponse,
  USER_SUB_HEADER,
  type LoggedInUser,
  type VersionInfo,
} from '@shop-cart/server-common';

const items = [
  { productId: 'mug', name: 'Stoneware mug', price: 349, quantity: 2 },
  { productId: 'kettle', name: 'Steel kettle', price: 1499, quantity: 1 },
];

/** Catalog's backend, when Cart reads names and prices from it (MVP-2, ADR 0005). */
export interface CatalogSource {
  url: string;
  /** Cart's own service access token, never the user's. */
  headers: () => Promise<Record<string, string>>;
  timeoutMs: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

/** Names and prices from Catalog's backend; any failure is a 503 for the cart. */
async function fromCatalog(catalog: CatalogSource, ids: string[], userSub: string | undefined) {
  let res: Response;
  try {
    res = await fetch(
      `${catalog.url}/service/products?ids=${ids.map(encodeURIComponent).join(',')}`,
      {
        headers: {
          ...(await catalog.headers()),
          ...(userSub ? { [USER_SUB_HEADER]: userSub } : {}),
        },
        signal: AbortSignal.timeout(catalog.timeoutMs),
      },
    );
  } catch {
    throw new HttpError(503, 'Catalog cannot be reached');
  }
  if (!res.ok) throw new HttpError(503, `Catalog answered ${res.status}`);
  return new Map(((await res.json()) as Product[]).map((product) => [product.id, product]));
}

/**
 * Stand-in for the Cart backend service. Dev only; never deployed. With `requireUser` (MVP-2,
 * `AUTH_ENABLED=true`, or the development bypass), every route but health and version needs a
 * logged-in user with a Cart role.
 */
export function createApp(
  version: VersionInfo,
  requireUser?: RequestHandler,
  devBypass = false,
  catalog?: CatalogSource,
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

  app.get('/cart', async (_req, res) => {
    // With Catalog as the source, Cart keeps only product IDs and quantities (MVP-2); without it,
    // its own copy of names and prices (MVP-1).
    let lines = items;
    if (catalog) {
      const user = res.locals.user as LoggedInUser | undefined;
      const products = await fromCatalog(
        catalog,
        items.map((item) => item.productId),
        user?.sub,
      );
      lines = items.map(({ productId, quantity }) => {
        const product = products.get(productId);
        if (!product) throw new HttpError(503, `Catalog has no ${productId}`);
        return { productId, name: product.name, price: product.price, quantity };
      });
    }
    const total = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ items: lines, total });
  });

  app.get('/test-error', () => {
    throw new Error('Cart mock backend test error');
  });

  app.use(notFound);
  app.use(problemHandler);
  return app;
}
