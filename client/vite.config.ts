import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Cart is served by its FES under /mfe/cart/, through the router's one public origin.
export default defineConfig({
  base: '/mfe/cart/',
  plugins: [react()],
  build: {
    manifest: true,
    // Maps are uploaded to New Relic and then deleted (scripts/sourcemaps.mjs); no file links to them.
    sourcemap: 'hidden',
    rolldownOptions: {
      // No index.html: the Shell loads the entry. Its exports are the single-spa lifecycles.
      input: 'src/entry.tsx',
      preserveEntrySignatures: 'exports-only',
      output: {
        entryFileNames: 'assets/entry-[hash].js',
        // React is a vendor chunk of its own, so the entry holds only lifecycles and routes.
        codeSplitting: {
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
