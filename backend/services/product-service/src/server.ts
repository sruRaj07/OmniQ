/**
 * OmniQ product service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cluster from "cluster";
import os from "os";
import { ok } from "../../../shared/utils/responseFormatter";
import { requireAuth } from "../../../shared/utils/gatewayIdentity";
import { installGracefulShutdown } from "../../../shared/utils/gracefulShutdown";
import { createProductController, updateProductController, getProductController, listProductsController, listSellerProductsController, getAdvertisementsController, searchProductsController, getCategoryTagsController } from "./controllers/productController";
import multer from "multer";

dotenv.config();

if (cluster.isPrimary) {
  // ⚡ PERFORMANCE: os.cpus() reports the HOST's core count inside a container - it does not read
  // the cgroup CPU quota. On a 0.5-1.0 vCPU Container App that meant forking one full Node heap per
  // host core, so the container spent its memory on idle workers and got OOM-killed under load.
  // Cap by the actual allocation, overridable with WEB_CONCURRENCY.
  const configured = Number(process.env.WEB_CONCURRENCY);
  const numCPUs = Number.isFinite(configured) && configured > 0
    ? Math.min(configured, 4)
    : Math.min(os.cpus().length, 2);
  console.log(`Primary ${process.pid} is running. Forking ${numCPUs} worker(s).`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();
  const port = Number(process.env.PORT ?? 4001);
  // Images are buffered in memory before going to Supabase Storage, so the per-file cap matters:
  // 5 unbounded uploads would otherwise sit in the heap of a small container at once.
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 5 } });

  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => response.json(ok({ service: "product-service", status: "ok", uptime: process.uptime(), version: "1.0.0", pid: process.pid })));

  // Public catalogue reads.
  app.get("/products", listProductsController);
  app.get("/products/advertisements", getAdvertisementsController);
  app.get("/products/search", searchProductsController);
  app.get("/products/tags", getCategoryTagsController);

  // `/products/seller` must stay above `/products/:id`, or Express matches it as id="seller".
  app.get("/products/seller", requireAuth, listSellerProductsController);

  app.get("/products/:id", getProductController);

  // Seller-owned writes.
  app.post("/products", requireAuth, upload.array("images", 5), createProductController);
  app.put("/products/:id", requireAuth, upload.array("images", 5), updateProductController);

  // Removed: DELETE /products/:id, PATCH /products/:id/stock and POST /products/:id/flag were
  // unauthenticated stubs that returned {deleted:true} / {updated:true} / {flagged:true} without
  // doing anything. Nothing in the app calls them, and a route that reports success for a
  // destructive action it never performed is a liability. Re-add with real implementations behind
  // the appropriate guard.

  const server = app.listen(port, "0.0.0.0", () => console.log(`OmniQ product service running on ${port} (Worker ${process.pid})`));

  // Each cluster worker drains its own connections. The primary forwards the signal by way of the
  // platform delivering it to the whole process group, so no extra plumbing is needed here.
  installGracefulShutdown(server, `product-service worker ${process.pid}`);
}
