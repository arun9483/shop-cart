import { Heading, Paragraph } from '@arun-dev/ui';
import { useEffect, useState } from 'react';
import { fetchWithTimeout } from '../timeouts';
import styles from './Cart.module.css';
import { NavLink } from './NavLink';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price);

type State = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; cart: Cart };

export default function CartPage() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchWithTimeout('/api/cart', controller.signal)
      .then((res) => (res.ok ? (res.json() as Promise<Cart>) : Promise.reject(new Error())))
      .then((cart) => {
        setState({ status: 'ready', cart });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <>
      <Heading level={1}>Cart</Heading>
      {state.status === 'loading' && <Paragraph>Loading…</Paragraph>}
      {state.status === 'failed' && <Paragraph>The cart could not be loaded.</Paragraph>}
      {state.status === 'ready' &&
        (state.cart.items.length === 0 ? (
          <Paragraph>Your cart is empty.</Paragraph>
        ) : (
          <>
            <ul className={styles.list}>
              {state.cart.items.map((item) => (
                // A link to another MFE is only a URL; Cart never imports Catalog.
                <li key={item.productId}>
                  <NavLink to={`/catalog/${item.productId}`}>{item.name}</NavLink> × {item.quantity}
                  , {formatPrice(item.price * item.quantity)}
                </li>
              ))}
            </ul>
            <Paragraph>Total: {formatPrice(state.cart.total)}</Paragraph>
          </>
        ))}
    </>
  );
}
