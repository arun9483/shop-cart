import { Component, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/**
 * Cart's failing-MFE fallback, given to single-spa-react as `errorBoundaryClass`. A caught error
 * never reaches `window`, so it is reported with the standard `reportError`, which the Shell's
 * browser agent captures. Navigating to another page clears the fallback.
 */
export class ErrorBoundary<Props extends { children?: ReactNode }> extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidMount() {
    window.addEventListener('popstate', this.reset);
  }

  override componentWillUnmount() {
    window.removeEventListener('popstate', this.reset);
  }

  override componentDidCatch(error: unknown) {
    reportError(error);
  }

  reset = () => {
    this.setState({ failed: false });
  };

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert">
        <h1>Cart is unavailable</h1>
        <p>Something went wrong. The rest of the shop still works.</p>
      </div>
    );
  }
}
