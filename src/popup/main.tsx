import React from 'react';
import { createRoot } from 'react-dom/client';
import { initSentry } from '../sentry';
import { App } from './components/App';
import { QueryParamProvider } from './components/QueryParamProvider';
initSentry();

const reactRoot = document.querySelector('.react-root');
if (!reactRoot) throw new Error('.react-root is not found');

createRoot(reactRoot).render(
  <QueryParamProvider>
    <App />
  </QueryParamProvider>,
);
