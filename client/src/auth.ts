import { createAuth } from '@arun-dev/client';
import { timeouts } from './timeouts';

// MVP-2 login, client side, from @arun-dev/client with the server's default names (`/auth`, `shop`).
// The package is shared at build time: nothing passes between the Shell and this MFE at runtime.
export const { apiFetch } = createAuth({ apiTimeoutMs: timeouts.api });
