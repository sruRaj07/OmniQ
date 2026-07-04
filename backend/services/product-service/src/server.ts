/**
 * OmniQ product service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { createProductController, getProductController, listProductsController, listSellerProductsController, getAdvertisementsController } from "./controllers/productController";
import multer from "multer";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4001);
const upload = multer({ storage: multer.memoryStorage() });

app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (_request, response) => response.json(ok({ service: "product-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));
app.get("/products", listProductsController);
app.get("/products/advertisements", getAdvertisementsController);
app.get("/products/seller", listSellerProductsController);
app.get("/products/:id", getProductController);
app.post("/products", upload.array("images", 5), createProductController);
app.put("/products/:id", upload.array("images", 5), createProductController);
app.delete("/products/:id", (_request, response) => response.json(ok({ deleted: true })));
app.patch("/products/:id/stock", (_request, response) => response.json(ok({ updated: true })));
app.post("/products/:id/flag", (_request, response) => response.json(ok({ flagged: true })));

app.listen(port, "0.0.0.0", () => console.log(`OmniQ product service running on ${port}`));
