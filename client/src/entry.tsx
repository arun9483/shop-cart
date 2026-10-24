import * as React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import { ErrorBoundary } from './ErrorBoundary';
import { Root } from './Root';

// The lean entry: only the single-spa lifecycles and the route table. The Shell mounts Cart into
// the element it passes as the `domElement` prop.
const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: Root,
  errorBoundaryClass: ErrorBoundary,
});

export const { bootstrap, mount, unmount } = lifecycles;
