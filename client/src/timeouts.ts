import { positiveMs, withTimeout } from '@arun-dev/client';
import { lazy, type ComponentType } from 'react';

// Timeouts for this unit, set at build time from VITE_ variables (see .env.example). They run on
// setTimeout, so a test can fast-forward the page clock instead of waiting.
export const timeouts = {
  /** A lazy feature chunk slower than this shows the unit's fallback. */
  lazyChunk: positiveMs(import.meta.env.VITE_LAZY_CHUNK_TIMEOUT_MS, 5000),
  /** An API call slower than this fails like any other failed call. */
  api: positiveMs(import.meta.env.VITE_API_TIMEOUT_MS, 4000),
};

/** `React.lazy` whose chunk must arrive within `timeouts.lazyChunk`. */
export function lazyWithTimeout<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
) {
  return lazy(() => withTimeout(load(), timeouts.lazyChunk, 'Loading a page'));
}
