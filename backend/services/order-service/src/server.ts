/**
 * OmniQ order service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { requireAuth } from "../../../shared/utils/gatewayIdentity";
import { placeOrderController, updateOrderStatusController, listOrdersController, listSellerOrdersController, getCartController, addToCartController, removeFromCartController, clearCartController, updateCartItemController, cancelOrderController } from "./controllers/orderController";
import { installGracefulShutdown } from "../../../shared/utils/gracefulShutdown";
import { notFoundHandler, errorHandler } from "../../../shared/utils/httpErrors";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4002);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.get("/health", (_request, response) => response.json(ok({ service: "order-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));

// SECURITY: every order and cart route is per-user. Guarded at the router so a route cannot be
// added without authentication, and so this service is not dependent on the gateway alone.
app.use("/orders", requireAuth);
app.use("/cart", requireAuth);

app.post("/orders", placeOrderController);
app.get("/orders", listOrdersController);
app.get("/orders/seller", listSellerOrdersController);
app.patch("/orders/:id/status", updateOrderStatusController);
app.post("/orders/:id/cancel", cancelOrderController);

// Cart routes
app.get("/cart", getCartController);
app.post("/cart/items", addToCartController);
app.patch("/cart/items/:productId", updateCartItemController);
app.delete("/cart/items/:productId", removeFromCartController);
app.delete("/cart", clearCartController);

// Terminal handlers: must come after every route so they only see what nothing else matched.
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(port, "0.0.0.0", () => console.log(`OmniQ order service running on ${port}`));
installGracefulShutdown(server, "order-service");
