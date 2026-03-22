import { randomUUID } from 'node:crypto';
import type { Product, ProductInput } from '../models/product.js';

export interface ProductDb {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | undefined>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: ProductInput): Promise<Product | undefined>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryDb implements ProductDb {
  private products = new Map<string, Product>();

  async getAll(): Promise<Product[]> {
    return [...this.products.values()];
  }

  async getById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async create(input: ProductInput): Promise<Product> {
    const product: Product = { id: randomUUID(), ...input };
    this.products.set(product.id, product);
    return product;
  }

  async update(id: string, input: ProductInput): Promise<Product | undefined> {
    if (!this.products.has(id)) return undefined;
    const updated: Product = { id, ...input };
    this.products.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.products.delete(id);
  }
}
