import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { Root } from './Root';
import { match } from './routing';

const cart = {
  items: [
    { productId: 'mug', name: 'Stoneware mug', price: 349, quantity: 2 },
    { productId: 'kettle', name: 'Steel kettle', price: 1499, quantity: 1 },
  ],
  total: 2197,
};

function visit(path: string) {
  act(() => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

function stubCart(response: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(response)),
  );
}

beforeEach(() => {
  stubCart(Response.json(cart));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('match', () => {
  it.each([
    ['/cart', { page: 'cart' }],
    ['/cart/test-error', { page: 'test-error' }],
    ['/cart/a', { page: 'not-found' }],
  ])('%s', (path, route) => {
    expect(match(path)).toEqual(route);
  });
});

describe('Root', () => {
  it('loads the cart from its API and links each item to the catalog', async () => {
    visit('/cart');
    render(<Root />);
    const mug = await screen.findByRole('link', { name: 'Stoneware mug' });
    expect(mug.getAttribute('href')).toBe('/catalog/mug');
    expect(screen.getByText(/Total: ₹2,197/)).toBeTruthy();
  });

  it('says when the cart is empty', async () => {
    stubCart(Response.json({ items: [], total: 0 }));
    visit('/cart');
    render(<Root />);
    expect(await screen.findByText('Your cart is empty.')).toBeTruthy();
  });

  it('says when the cart cannot be loaded', async () => {
    stubCart(new Response(null, { status: 500 }));
    visit('/cart');
    render(<Root />);
    expect(await screen.findByText('The cart could not be loaded.')).toBeTruthy();
  });

  it('shows its fallback for a render error, reports it, and clears it on navigation', async () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    visit('/cart/test-error?kind=render');
    render(
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>,
    );
    expect(await screen.findByRole('heading', { name: 'Cart is unavailable' })).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith(new Error('Cart client test error (render)'));
    visit('/cart');
    expect(await screen.findByRole('heading', { name: 'Cart' })).toBeTruthy();
  });
});
