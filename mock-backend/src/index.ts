import {
  connectIdp,
  devBypassFromEnv,
  devRequireUser,
  oidcSettingsFromEnv,
  requireUser,
  serviceCaller,
} from '@arun-dev/server/auth';
import { keycloakAdapter } from '@arun-dev/server/auth/keycloak';
import { closeOnSignal, readVersion } from '@arun-dev/server/http';
import { createApp, type CatalogSource } from './app.js';

const port = Number(process.env.PORT ?? 4003);

// Login (MVP-2) is off unless AUTH_ENABLED=true; standalone, the development bypass acts as a fixed user.
const dev = devBypassFromEnv();
const settings = dev ? undefined : oidcSettingsFromEnv();
const idp = settings && connectIdp(settings, { keycloak: keycloakAdapter });
const loggedIn = dev
  ? devRequireUser(dev)
  : // This backend's client at the IdP: its name in a token's aud, and the client its roles are on.
    idp && requireUser({ ...idp, audience: process.env.OIDC_AUDIENCE ?? 'cart-backend' });
// Names and prices from Catalog's backend (ADR 0005): only with login on and CATALOG_BACKEND_URL set.
const catalogUrl = process.env.CATALOG_BACKEND_URL;
const catalog: CatalogSource | undefined =
  idp && catalogUrl
    ? {
        url: catalogUrl,
        headers: serviceCaller(idp.idp),
        timeoutMs: Number(process.env.CATALOG_TIMEOUT_MS ?? 2000),
      }
    : undefined;

const server = createApp(readVersion(import.meta.dirname), loggedIn, Boolean(dev), catalog).listen(
  port,
  () => {
    console.log(
      `cart mock backend on http://localhost:${port}${loggedIn ? ' (login on)' : ''}${catalog ? `, products from ${catalog.url}` : ''}`,
    );
  },
);
closeOnSignal(server);
