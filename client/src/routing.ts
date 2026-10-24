import { useSyncExternalStore } from 'react';

// No router library and no single-spa import: the Shell's single-spa patches `history`, fires
// `popstate` after every in-page navigation and `single-spa:routing-event` after each reroute.
function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener('single-spa:routing-event', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('single-spa:routing-event', onChange);
  };
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function useSearch(): string {
  return useSyncExternalStore(subscribe, () => window.location.search);
}

export function navigate(to: string): void {
  window.history.pushState(null, '', to);
}

export type Route = { page: 'cart' } | { page: 'test-error' } | { page: 'not-found' };

/** The Cart route table. */
export function match(pathname: string): Route {
  if (pathname === '/cart' || pathname === '/cart/') return { page: 'cart' };
  if (pathname === '/cart/test-error') return { page: 'test-error' };
  return { page: 'not-found' };
}
