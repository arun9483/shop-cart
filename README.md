# shop-cart

The Cart micro frontend of the shop platform: the cart page. The
[Shell](https://github.com/arun9483/shop-shell) loads it on `/cart`. Requirements and decisions are in
[arun-mfe-platform](https://github.com/arun9483/arun-mfe-platform)
([vision](https://github.com/arun9483/arun-mfe-platform/blob/main/docs/vision.md),
[MVP](https://github.com/arun9483/arun-mfe-platform/blob/main/docs/mvp.md)).

| Folder           | What                                                                  | Port   |
| ---------------- | --------------------------------------------------------------------- | ------ |
| `client/`        | React + single-spa-react MFE, built with Vite, served at `/mfe/cart/` | —      |
| `fes/`           | Express FES: serves the client, `/api/cart/*`, health and version     | `3003` |
| `mock-backend/`  | Dev only. Stand-in for the Cart backend service                       | `4003` |
| `server-common/` | Trace context, problem+json, health and version for the servers       | —      |

## How it loads

The Shell imports `/mfe/cart/entry.js` on the first visit to `/cart`. That file is a one-line
re-export of the hashed entry, which holds only the single-spa lifecycles and the route table. The
cart page and the test-error page are lazy chunks; React is a chunk of its own.

| Route              | Page                                   |
| ------------------ | -------------------------------------- |
| `/cart`            | The cart, loaded from its backend      |
| `/cart/test-error` | Test errors (`?kind=` as in the Shell) |

Cart items link to `/catalog/<id>`. That is only a URL: Cart never imports Catalog.

## Run

Node 24.22.1 or newer and pnpm 11 (`corepack enable`). Copy each `.env.example` to `.env`; the New
Relic values in it are placeholders.

```sh
pnpm install
pnpm build
pnpm start          # FES and mock backend
```

Then run the Shell and open http://localhost:3000/cart. The Shell's router sends `/mfe/cart/*` and
`/api/cart/*` here.

Cart errors are reported by the Shell's browser agent, so `NEW_RELIC_BROWSER_APP_ID` in `client/.env`
is the Shell's browser application ID; the source maps are uploaded there.

## Check

```sh
pnpm lint && pnpm typecheck && pnpm test
```
