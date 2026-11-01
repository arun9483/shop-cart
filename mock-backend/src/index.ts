import { closeOnSignal, readVersion } from '@shop-cart/server-common';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4003);

const server = createApp(readVersion(import.meta.dirname)).listen(port, () => {
  console.log(`cart mock backend on http://localhost:${port}`);
});
closeOnSignal(server);
