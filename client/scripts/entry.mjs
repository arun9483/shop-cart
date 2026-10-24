// Writes dist/entry.js, the only unhashed script: a one-line re-export of the hashed entry. The Shell
// always loads /mfe/cart/entry.js, and every file holding code keeps a unique URL and source map.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
if (!entry) throw new Error('entry: no entry chunk in the Vite manifest');

writeFileSync('dist/entry.js', `export * from './${entry.file}';\n`);
// The manifest is a build detail; it is not served.
rmSync('dist/.vite', { recursive: true });
console.log(`entry: dist/entry.js -> ${entry.file}`);
