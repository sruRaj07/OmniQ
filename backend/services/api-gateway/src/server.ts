/**
 * OmniQ API gateway - public entry point and proxy router.
 * Author: OmniQ Team
 */
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ok } from "../../../shared/utils/responseFormatter";
import { attachRequestId } from "./middleware/requestLogger";
import { globalLimiter, adminLimiter, orderLimiter, productListLimiter, zoneCheckLimiter } from "./middleware/rateLimiterMiddleware";
import { authMiddleware } from "./middleware/authMiddleware";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter((origin): origin is string => Boolean(origin));

app.use(attachRequestId);
app.use(helmet());
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true, credentials: true }));
app.use(compression());
app.use(morgan("combined"));
app.use(globalLimiter);

app.get("/health", (_request, response) => {
  response.json(ok({ service: "api-gateway", status: "ok", uptime: process.uptime(), version: "1.0.0" }));
});

app.get("/products", productListLimiter, createProxyMiddleware({ target: process.env.PRODUCT_SERVICE_URL ?? "http://localhost:4001", changeOrigin: true }));
app.use("/products", authMiddleware, createProxyMiddleware({ target: process.env.PRODUCT_SERVICE_URL ?? "http://localhost:4001", changeOrigin: true }));
app.post("/orders", authMiddleware, orderLimiter, createProxyMiddleware({ target: process.env.ORDER_SERVICE_URL ?? "http://localhost:4002", changeOrigin: true }));
app.use("/orders", authMiddleware, createProxyMiddleware({ target: process.env.ORDER_SERVICE_URL ?? "http://localhost:4002", changeOrigin: true }));
app.use("/sellers", authMiddleware, createProxyMiddleware({ target: process.env.SELLER_SERVICE_URL ?? "http://localhost:4003", changeOrigin: true }));
app.use("/users", authMiddleware, createProxyMiddleware({ target: process.env.USER_SERVICE_URL ?? "http://localhost:4004", changeOrigin: true }));
app.post("/location/zone-check", authMiddleware, zoneCheckLimiter, createProxyMiddleware({ target: process.env.LOCATION_SERVICE_URL ?? "http://localhost:4005", changeOrigin: true }));
app.use("/location", authMiddleware, createProxyMiddleware({ target: process.env.LOCATION_SERVICE_URL ?? "http://localhost:4005", changeOrigin: true }));
app.use("/admin", authMiddleware, adminLimiter, createProxyMiddleware({ target: process.env.ADMIN_SERVICE_URL ?? "http://localhost:4006", changeOrigin: true }));
app.use("/cart", authMiddleware, createProxyMiddleware({ target: process.env.ORDER_SERVICE_URL ?? "http://localhost:4002", changeOrigin: true }));
app.use("/auth", createProxyMiddleware({ target: process.env.USER_SERVICE_URL ?? "http://localhost:4004", changeOrigin: true }));

app.listen(port, () => {
  console.log(`OmniQ API gateway running on ${port}`);
});
