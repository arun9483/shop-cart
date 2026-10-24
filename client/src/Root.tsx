import { Suspense } from 'react';
import { match, usePathname } from './routing';
import { lazyWithTimeout } from './timeouts';

// Each feature is its own chunk, loaded on first use. The entry imports no feature code and no
// design-system components, so it stays lean.
const CartPage = lazyWithTimeout(() => import('./features/CartPage'));
const TestError = lazyWithTimeout(() => import('./features/TestError'));

function Page() {
  const route = match(usePathname());
  switch (route.page) {
    case 'cart':
      return <CartPage />;
    case 'test-error':
      return <TestError />;
    case 'not-found':
      return <h1>Page not found</h1>;
  }
}

export function Root() {
  return (
    <Suspense fallback={<progress aria-label="Loading" />}>
      <Page />
    </Suspense>
  );
}
