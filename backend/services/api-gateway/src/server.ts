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

const proxyConfig = (target: string) => ({
  target,
  changeOrigin: true
});

app.get("/products*", productListLimiter, createProxyMiddleware(proxyConfig(process.env.PRODUCT_SERVICE_URL ?? "http://localhost:4001")));
app.all("/products*", authMiddleware, createProxyMiddleware(proxyConfig(process.env.PRODUCT_SERVICE_URL ?? "http://localhost:4001")));

app.post("/orders*", authMiddleware, orderLimiter, createProxyMiddleware(proxyConfig(process.env.ORDER_SERVICE_URL ?? "http://localhost:4002")));
app.all("/orders*", authMiddleware, createProxyMiddleware(proxyConfig(process.env.ORDER_SERVICE_URL ?? "http://localhost:4002")));

app.all("/sellers*", authMiddleware, createProxyMiddleware(proxyConfig(process.env.SELLER_SERVICE_URL ?? "http://localhost:4003")));
app.all("/users*", authMiddleware, createProxyMiddleware(proxyConfig(process.env.USER_SERVICE_URL ?? "http://localhost:4004")));

app.post("/location/zone-check", authMiddleware, zoneCheckLimiter, createProxyMiddleware(proxyConfig(process.env.LOCATION_SERVICE_URL ?? "http://localhost:4005")));
app.all("/location*", authMiddleware, createProxyMiddleware(proxyConfig(process.env.LOCATION_SERVICE_URL ?? "http://localhost:4005")));

app.all("/admin*", authMiddleware, adminLimiter, createProxyMiddleware(proxyConfig(process.env.ADMIN_SERVICE_URL ?? "http://localhost:4006")));
app.all("/cart*", authMiddleware, createProxyMiddleware(proxyConfig(process.env.ORDER_SERVICE_URL ?? "http://localhost:4002")));
app.all("/auth*", createProxyMiddleware(proxyConfig(process.env.USER_SERVICE_URL ?? "http://localhost:4004")));

app.listen(port, "0.0.0.0", () => {
  console.log(`OmniQ API gateway running on ${port}`);
});
