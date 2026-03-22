import { PORT } from './config.js';
import { InMemoryDb } from './db/inMemoryDb.js';
import { createApp } from './server.js';

const db = new InMemoryDb();
const app = await createApp(db);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server running on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
