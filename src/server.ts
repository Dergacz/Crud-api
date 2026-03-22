import Fastify from 'fastify';
import type { ProductDb } from './db/inMemoryDb.js';
import { productRoutes } from './routes/products.js';

export async function createApp(db: ProductDb) {
  const app = Fastify({ logger: false });

  await app.register(productRoutes, { db });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ message: 'Route not found.' });
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({ message: 'Internal server error.' });
  });

  return app;
}
