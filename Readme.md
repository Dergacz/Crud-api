# CRUD API — Product Catalog

REST API for managing a product catalog, built with Fastify and TypeScript.

## Prerequisites

- Node.js v24.10.0 or higher

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file in the project root (see `.env.example`):

```
PORT=4000
```

## Running the Application

### Development Mode

Runs with hot-reload via `tsx watch`:

```bash
npm run start:dev
```

### Production Mode

Builds with esbuild, then runs the bundled file:

```bash
npm run start:prod
```

### Cluster Mode (Horizontal Scaling)

Starts a load balancer on `PORT` and multiple workers on `PORT+1`, `PORT+2`, etc. using round-robin distribution. Database state is shared across all workers.

```bash
npm run start:multi
```

## API Endpoints

Base URL: `http://localhost:4000`

### GET /api/products

Returns all products.

**Response:** `200` — array of products

### GET /api/products/:productId

Returns a single product by ID.

**Response:**
- `200` — product object
- `400` — invalid UUID format
- `404` — product not found

### POST /api/products

Creates a new product.

**Request body:**

```json
{
  "name": "Laptop",
  "description": "A powerful laptop",
  "price": 999.99,
  "category": "electronics",
  "inStock": true
}
```

All fields are required. `price` must be a positive number.

**Response:**
- `201` — created product (with generated `id`)
- `400` — validation error

### PUT /api/products/:productId

Updates an existing product. Request body is the same as POST (all fields required).

**Response:**
- `200` — updated product
- `400` — invalid UUID or validation error
- `404` — product not found

### DELETE /api/products/:productId

Deletes a product.

**Response:**
- `204` — successfully deleted
- `400` — invalid UUID format
- `404` — product not found

## Testing

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Linting & Formatting

```bash
npm run lint
npm run lint:fix
npm run format
```
