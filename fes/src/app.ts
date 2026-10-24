import express, { type Express } from 'express';
import {
  forward,
  healthRouter,
  notFound,
  problemHandler,
  traceResponse,
  type VersionInfo,
} from '@shop-cart/server-common';

export interface FesConfig {
  /** The Cart backend service, e.g. the mock backend in development. */
  backendUrl: string;
  /** The built Cart client. */
  clientDist: string;
  version: VersionInfo;
  /** How long a backend call may take: a slower API call is a 504, a slower readiness check fails. */
  backendTimeoutMs: number;
}

const NO_CACHE = 'no-cache';
const IMMUTABLE = 'public, max-age=31536000, immutable';

async function backendReady(backendUrl: string, timeoutMs: number): Promise<boolean> {
  const res = await fetch(`${backendUrl}/health/ready`, { signal: AbortSignal.timeout(timeoutMs) });
  return res.ok;
}

export function createApp({
  backendUrl,
  clientDist,
  version,
  backendTimeoutMs,
}: FesConfig): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(healthRouter({ version, ready: () => backendReady(backendUrl, backendTimeoutMs) }));

  const api = express.Router();
  api.use(traceResponse);
  api.get('/', (_req, res) => forward(res, `${backendUrl}/cart`, backendTimeoutMs));
  api.get('/test-error', async (req, res) => {
    if (req.query.in === 'backend') {
      await forward(res, `${backendUrl}/test-error`, backendTimeoutMs);
      return;
    }
    throw new Error('Cart FES test error');
  });
  api.use(notFound);
  api.use(problemHandler);
  app.use('/api/cart', api);

  // Hashed files never change; entry.js and version.json must be revalidated so a deploy is live
  // at once. The Shell serves the page itself, so there is no HTML here.
  app.use(
    '/mfe/cart',
    express.static(clientDist, {
      index: false,
      setHeaders: (res, path) => {
        res.set('Cache-Control', path.includes('/assets/') ? IMMUTABLE : NO_CACHE);
      },
    }),
  );
  app.use(notFound);
  app.use(problemHandler);
  return app;
}
