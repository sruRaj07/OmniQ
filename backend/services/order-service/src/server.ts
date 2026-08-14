/**
 * OmniQ order service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { placeOrderController, updateOrderStatusController, listOrdersController, listSellerOrdersController, getCartController, addToCartController, removeFromCartController, clearCartController, updateCartItemController, cancelOrderController } from "./controllers/orderController";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4002);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (_request, response) => response.json(ok({ service: "order-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));
app.post("/orders", placeOrderController);
app.get("/orders", listOrdersController);
app.get("/orders/seller", listSellerOrdersController);
app.patch("/orders/:id/status", updateOrderStatusController);
app.post("/orders/:id/cancel", cancelOrderController);
app.get("/orders/export", (_request, response) => response.type("text/csv").send("id,status,total\nOMQ-2847,pending,1999\n"));

// Cart routes
app.get("/cart", getCartController);
app.post("/cart/items", addToCartController);
app.patch("/cart/items/:productId", updateCartItemController);
app.delete("/cart/items/:productId", removeFromCartController);
app.delete("/cart", clearCartController);
app.listen(port, "0.0.0.0", () => console.log(`OmniQ order service running on ${port}`));
