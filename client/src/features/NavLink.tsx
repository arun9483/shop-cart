import { Link } from '@arun-dev/ui';
import type { MouseEvent, ReactNode } from 'react';
import { navigate } from '../routing';

/** A link that navigates in the page, so the Shell's single-spa keeps Cart mounted. */
export function NavLink({ to, children }: { to: string; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }

  return (
    <Link href={to} onClick={onClick}>
      {children}
    </Link>
  );
}
