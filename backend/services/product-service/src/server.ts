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
import { createProductController, updateProductController, getProductController, listProductsController, listSellerProductsController, getAdvertisementsController, searchProductsController, getCategoryTagsController } from "./controllers/productController";
import multer from "multer";

dotenv.config();

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid} is running. Forking for ${numCPUs} CPUs.`);

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
  const upload = multer({ storage: multer.memoryStorage() });

  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(express.json());
  
  app.get("/health", (_request, response) => response.json(ok({ service: "product-service", status: "ok", uptime: process.uptime(), version: "1.0.0", pid: process.pid })));
  app.get("/products", listProductsController);
  app.get("/products/advertisements", getAdvertisementsController);
  app.get("/products/search", searchProductsController);
  app.get("/products/tags", getCategoryTagsController);
  app.get("/products/seller", listSellerProductsController);
  app.get("/products/:id", getProductController);
  app.post("/products", upload.array("images", 5), createProductController);
  app.put("/products/:id", upload.array("images", 5), updateProductController);
  app.delete("/products/:id", (_request, response) => response.json(ok({ deleted: true })));
  app.patch("/products/:id/stock", (_request, response) => response.json(ok({ updated: true })));
  app.post("/products/:id/flag", (_request, response) => response.json(ok({ flagged: true })));

  app.listen(port, "0.0.0.0", () => console.log(`OmniQ product service running on ${port} (Worker ${process.pid})`));
}
