import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { ProductDb } from '../db/inMemoryDb.js';
import { ProductInputSchema } from '../models/product.js';
import { isValidUuid } from '../utils/validation.js';

interface ProductRoutesOptions extends FastifyPluginOptions {
  db: ProductDb;
}

export async function productRoutes(
  fastify: FastifyInstance,
  options: ProductRoutesOptions,
): Promise<void> {
  const { db } = options;

  fastify.get('/api/products', async (_request, reply) => {
    const products = await db.getAll();
    return reply.code(200).send(products);
  });

  fastify.get('/api/products/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string };

    if (!isValidUuid(productId)) {
      return reply.code(400).send({ message: 'Invalid product ID format. Must be a valid UUID.' });
    }

    const product = await db.getById(productId);
    if (!product) {
      return reply.code(404).send({ message: `Product with id ${productId} not found.` });
    }

    return reply.code(200).send(product);
  });

  fastify.post('/api/products', async (request, reply) => {
    const parsed = ProductInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message:
          'Validation failed. Required fields: name, description, price (positive number), category, inStock.',
        errors: parsed.error.issues,
      });
    }

    const product = await db.create(parsed.data);
    return reply.code(201).send(product);
  });

  fastify.put('/api/products/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string };

    if (!isValidUuid(productId)) {
      return reply.code(400).send({ message: 'Invalid product ID format. Must be a valid UUID.' });
    }

    const parsed = ProductInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message:
          'Validation failed. Required fields: name, description, price (positive number), category, inStock.',
        errors: parsed.error.issues,
      });
    }

    const updated = await db.update(productId, parsed.data);
    if (!updated) {
      return reply.code(404).send({ message: `Product with id ${productId} not found.` });
    }

    return reply.code(200).send(updated);
  });

  fastify.delete('/api/products/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string };

    if (!isValidUuid(productId)) {
      return reply.code(400).send({ message: 'Invalid product ID format. Must be a valid UUID.' });
    }

    const deleted = await db.delete(productId);
    if (!deleted) {
      return reply.code(404).send({ message: `Product with id ${productId} not found.` });
    }

    return reply.code(204).send();
  });
}
