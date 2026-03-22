import cluster from 'node:cluster';
import os from 'node:os';
import http from 'node:http';
import { PORT } from './config.js';
import { InMemoryDb } from './db/inMemoryDb.js';
import type { ProductDb } from './db/inMemoryDb.js';
import type { ProductInput } from './models/product.js';
import { createApp } from './server.js';
import { randomUUID } from 'node:crypto';

interface DbRequest {
  type: 'db-request';
  requestId: string;
  method: string;
  args: unknown[];
}

interface DbResponse {
  type: 'db-response';
  requestId: string;
  result: unknown;
}

interface DbError {
  type: 'db-error';
  requestId: string;
  error: string;
}

interface WorkerReady {
  type: 'ready';
}

type IpcMessage = DbRequest | DbResponse | DbError | WorkerReady;

if (cluster.isPrimary) {
  const numWorkers = os.availableParallelism() - 1;
  const db = new InMemoryDb();
  const readyWorkerPorts: number[] = [];
  let currentWorker = 0;

  for (let i = 0; i < numWorkers; i++) {
    const workerPort = PORT + i + 1;
    const worker = cluster.fork({ WORKER_PORT: String(workerPort) });

    worker.on('message', async (msg: IpcMessage) => {
      if (msg.type === 'ready') {
        readyWorkerPorts.push(workerPort);
        console.log(
          `Worker on port ${workerPort} is ready (${readyWorkerPorts.length}/${numWorkers})`,
        );
        return;
      }

      if (msg.type === 'db-request') {
        try {
          const method = msg.method as keyof ProductDb;
          const result = await (db[method] as (...args: unknown[]) => Promise<unknown>)(
            ...msg.args,
          );
          worker.send({
            type: 'db-response',
            requestId: msg.requestId,
            result,
          } satisfies DbResponse);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          worker.send({
            type: 'db-error',
            requestId: msg.requestId,
            error: errorMessage,
          } satisfies DbError);
        }
      }
    });
  }

  const balancer = http.createServer((req, res) => {
    if (readyWorkerPorts.length === 0) {
      res.writeHead(503);
      res.end(JSON.stringify({ message: 'No workers available' }));
      return;
    }

    const targetPort = readyWorkerPorts[currentWorker];
    currentWorker = (currentWorker + 1) % readyWorkerPorts.length;

    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', () => {
      res.writeHead(502);
      res.end(JSON.stringify({ message: 'Bad gateway' }));
    });

    req.pipe(proxyReq, { end: true });
  });

  balancer.listen(PORT, () => {
    console.log(
      `Load balancer on port ${PORT}, ${numWorkers} workers on ports ${PORT + 1}-${PORT + numWorkers}`,
    );
  });
} else {
  const workerPort = parseInt(process.env.WORKER_PORT!, 10);

  class ClusterWorkerDb implements ProductDb {
    private pending = new Map<
      string,
      { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
    >();

    constructor() {
      process.on('message', (msg: IpcMessage) => {
        if (msg.type === 'db-response' || msg.type === 'db-error') {
          const handler = this.pending.get(msg.requestId);
          if (handler) {
            this.pending.delete(msg.requestId);
            if (msg.type === 'db-response') {
              handler.resolve(msg.result);
            } else {
              handler.reject(new Error(msg.error));
            }
          }
        }
      });
    }

    private sendRequest(method: string, args: unknown[]): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const requestId = randomUUID();
        this.pending.set(requestId, { resolve, reject });
        process.send!({ type: 'db-request', requestId, method, args } satisfies DbRequest);
      });
    }

    async getAll() {
      return this.sendRequest('getAll', []) as ReturnType<ProductDb['getAll']>;
    }

    async getById(id: string) {
      return this.sendRequest('getById', [id]) as ReturnType<ProductDb['getById']>;
    }

    async create(input: ProductInput) {
      return this.sendRequest('create', [input]) as ReturnType<ProductDb['create']>;
    }

    async update(id: string, input: ProductInput) {
      return this.sendRequest('update', [id, input]) as ReturnType<ProductDb['update']>;
    }

    async delete(id: string) {
      return this.sendRequest('delete', [id]) as ReturnType<ProductDb['delete']>;
    }
  }

  const db = new ClusterWorkerDb();
  const app = await createApp(db);
  await app.listen({ port: workerPort, host: '0.0.0.0' });
  console.log(`Worker ${process.pid} listening on port ${workerPort}`);
  process.send!({ type: 'ready' } satisfies WorkerReady);
}
