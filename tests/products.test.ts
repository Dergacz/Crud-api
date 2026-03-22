import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../src/server.js';
import { InMemoryDb } from '../src/db/inMemoryDb.js';

let app: FastifyInstance;

beforeEach(async () => {
  const db = new InMemoryDb();
  app = await createApp(db);
});

const sampleProduct = {
  name: 'Test Product',
  description: 'A test product description',
  price: 29.99,
  category: 'electronics',
  inStock: true,
};

describe('Scenario 1: Full CRUD lifecycle', () => {
  it('should create, read, update, delete a product', async () => {
    // POST — create
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: sampleProduct,
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    expect(created).toMatchObject(sampleProduct);
    expect(created.id).toBeDefined();

    const { id } = created;

    // GET all — should contain the product
    const getAllRes = await app.inject({ method: 'GET', url: '/api/products' });
    expect(getAllRes.statusCode).toBe(200);
    expect(getAllRes.json()).toHaveLength(1);

    // GET by ID
    const getOneRes = await app.inject({ method: 'GET', url: `/api/products/${id}` });
    expect(getOneRes.statusCode).toBe(200);
    expect(getOneRes.json()).toMatchObject(created);

    // PUT — update
    const updatedData = { ...sampleProduct, name: 'Updated Product', price: 49.99 };
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/products/${id}`,
      payload: updatedData,
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().name).toBe('Updated Product');
    expect(updateRes.json().price).toBe(49.99);
    expect(updateRes.json().id).toBe(id);

    // DELETE
    const deleteRes = await app.inject({ method: 'DELETE', url: `/api/products/${id}` });
    expect(deleteRes.statusCode).toBe(204);

    // GET by ID after delete — 404
    const getDeletedRes = await app.inject({ method: 'GET', url: `/api/products/${id}` });
    expect(getDeletedRes.statusCode).toBe(404);
  });
});

describe('Scenario 2: Validation errors', () => {
  it('should return 400 when required fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { name: 'Only name' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBeDefined();
  });

  it('should return 400 when price is negative', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { ...sampleProduct, price: -5 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when body is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Scenario 3: Invalid UUID handling', () => {
  it('should return 400 for GET with invalid UUID', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products/not-a-uuid' });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('UUID');
  });

  it('should return 400 for PUT with invalid UUID', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/products/invalid-id',
      payload: sampleProduct,
    });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for DELETE with invalid UUID', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/products/bad-uuid' });
    expect(res.statusCode).toBe(400);
  });
});

describe('Scenario 4: Not found for valid UUID', () => {
  const fakeUuid = '00000000-0000-0000-0000-000000000000';

  it('should return 404 for GET with non-existent UUID', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/products/${fakeUuid}` });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for PUT with non-existent UUID', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/products/${fakeUuid}`,
      payload: sampleProduct,
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for DELETE with non-existent UUID', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/products/${fakeUuid}` });
    expect(res.statusCode).toBe(404);
  });
});

describe('Scenario 5: Non-existing route', () => {
  it('should return 404 for unknown route', async () => {
    const res = await app.inject({ method: 'GET', url: '/some-non/existing/resource' });
    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBeDefined();
  });
});

describe('Scenario 6: GET all when empty', () => {
  it('should return 200 with empty array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});

describe('Scenario 7: Multiple products', () => {
  it('should list all created products', async () => {
    const products = [
      { ...sampleProduct, name: 'Product 1' },
      { ...sampleProduct, name: 'Product 2', category: 'books' },
      { ...sampleProduct, name: 'Product 3', price: 9.99 },
    ];

    for (const p of products) {
      await app.inject({ method: 'POST', url: '/api/products', payload: p });
    }

    const res = await app.inject({ method: 'GET', url: '/api/products' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(3);
  });
});
