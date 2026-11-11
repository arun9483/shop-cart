import express, { type Express, type RequestHandler, type Response } from 'express';
import {
  devBypassHeader,
  forward,
  noBackendAuth,
  type BackendHeaders,
  healthRouter,
  notFound,
  problemHandler,
  traceResponse,
  userBearer,
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
  /** Auth for backend calls: a Google identity token on Cloud Run, nothing locally. */
  backendHeaders?: BackendHeaders;
  /**
   * Login (MVP-2), off unless given: the gate on `/api/cart/*` and `entry.js` (no valid login → 401,
   * no Cart role → 403). The Shell logs users in; this FES only checks.
   */
  auth?: { gate: RequestHandler; devBypass?: boolean };
}

const NO_CACHE = 'no-cache';
const IMMUTABLE = 'public, max-age=31536000, immutable';

async function backendReady(
  backendUrl: string,
  timeoutMs: number,
  headers: BackendHeaders,
): Promise<boolean> {
  const res = await fetch(`${backendUrl}/health/ready`, {
    headers: await headers(),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return res.ok;
}

export function createApp({
  backendUrl,
  clientDist,
  version,
  backendTimeoutMs,
  backendHeaders = noBackendAuth,
  auth,
}: FesConfig): Express {
  const app = express();
  app.disable('x-powered-by');
  if (auth?.devBypass) app.use(devBypassHeader);
  app.use(
    healthRouter({
      version,
      ready: () => backendReady(backendUrl, backendTimeoutMs, backendHeaders),
    }),
  );

  // Backend calls carry the user's lightweight access token when login is on.
  const headersFor = async (res: Response) => ({ ...(await backendHeaders()), ...userBearer(res) });

  const api = express.Router();
  api.use(traceResponse);
  if (auth) {
    api.use(auth.gate);
    // The gate has just asked the backend's /me: its answer is the user.
    api.get('/me', (_req, res) => {
      res.set('Cache-Control', 'no-store').set('Vary', 'Cookie').json(res.locals.me);
    });
  }
  api.get('/', async (_req, res) =>
    forward(res, `${backendUrl}/cart`, backendTimeoutMs, await headersFor(res)),
  );
  api.get('/test-error', async (req, res) => {
    if (req.query.in === 'backend') {
      await forward(res, `${backendUrl}/test-error`, backendTimeoutMs, await headersFor(res));
      return;
    }
    throw new Error('Cart FES test error');
  });
  api.use(notFound);
  api.use(problemHandler);
  app.use('/api/cart', api);

  // Hashed files never change; entry.js and version.json must be revalidated so a deploy is live
  // at once. The Shell serves the page itself, so there is no HTML here.
  // The entry needs a valid login and a Cart role; hashed files and version.json stay public.
  if (auth) app.use('/mfe/cart/entry.js', auth.gate);
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
