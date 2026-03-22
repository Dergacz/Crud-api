import { z } from 'zod';

export const ProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  category: z.string().min(1),
  inStock: z.boolean(),
});

export const ProductSchema = ProductInputSchema.extend({
  id: z.string().uuid(),
});

export type ProductInput = z.infer<typeof ProductInputSchema>;
export type Product = z.infer<typeof ProductSchema>;
