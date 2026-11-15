import { resolve } from 'node:path';
import {
  connectIdp,
  devBypassFromEnv,
  devFesGate,
  fesGate,
  oidcSettingsFromEnv,
} from '@arun-dev/server/auth';
import { keycloakAdapter } from '@arun-dev/server/auth/keycloak';
import { backendAuth, closeOnSignal, readVersion, requiredEnv } from '@arun-dev/server/http';
import { createApp, type FesConfig } from './app.js';

const port = Number(process.env.PORT ?? 3003);
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4003';
const clientDist = resolve(process.env.CLIENT_DIST ?? '../client/dist');
const backendTimeoutMs = Number(process.env.BACKEND_TIMEOUT_MS ?? 3000);

// Login (MVP-2) is off unless AUTH_ENABLED=true. This FES has no client of its own: it accepts tokens
// the Shell's login client (LOGIN_CLIENT_ID) received, and asks its backend's /me. Standalone, the
// development bypass (AUTH_DEV_BYPASS=true) acts as a fixed user instead.
function login(): FesConfig['auth'] {
  const dev = devBypassFromEnv();
  if (dev) return { gate: devFesGate(dev).api, devBypass: true };
  const settings = oidcSettingsFromEnv(process.env, { withClient: false });
  if (!settings) return undefined;
  const gate = fesGate({
    ...connectIdp(settings, { keycloak: keycloakAdapter }),
    loginClientId: requiredEnv('LOGIN_CLIENT_ID'),
    backendUrl,
    // The backend's client at the IdP: its name in a token's aud.
    backendAudience: process.env.BACKEND_AUDIENCE ?? 'cart-backend',
    backendTimeoutMs,
  });
  return { gate: gate.api };
}

const auth = login();
const server = createApp({
  backendUrl,
  clientDist,
  version: readVersion(import.meta.dirname),
  backendTimeoutMs,
  // BACKEND_AUTH=google on Cloud Run, where the backend is private.
  backendHeaders: backendAuth(process.env.BACKEND_AUTH, backendUrl),
  ...(auth ? { auth } : {}),
}).listen(port, () => {
  console.log(`cart FES on http://localhost:${port}${auth ? ' (login on)' : ''}`);
});
closeOnSignal(server);
