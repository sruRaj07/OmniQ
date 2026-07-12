/**
 * OmniQ order service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { placeOrder, updateOrderStatus, listOrders, listSellerOrders, getCart, addToCart, removeFromCart, clearCart, updateCartItemQuantity } from "../services/orderService";

function extractTokenPayload(request: Request): any {
  const token = request.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload;
  } catch {
    return null;
  }
}

const DEFAULT_BUYER_ID = "d00d0000-0000-0000-0000-000000000000";

export async function placeOrderController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const buyerId = payload?.sub || DEFAULT_BUYER_ID;
    const order = await placeOrder(buyerId, request.body);
    response.status(201).json(ok(order));
  } catch (error: any) {
    response.status(400).json(fail("ORDER_VALIDATION_FAILED", error.message));
  }
}

export async function updateOrderStatusController(request: Request, response: Response): Promise<void> {
  try {
    const order = await updateOrderStatus(request.params.id, String(request.body.status ?? "packed"));
    response.json(ok(order));
  } catch (error: any) {
    response.status(400).json(fail("ORDER_UPDATE_FAILED", error.message));
  }
}

export async function listOrdersController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const buyerId = payload?.sub || DEFAULT_BUYER_ID;
    const orders = await listOrders(buyerId);
    response.json(ok(orders));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_ORDERS_FAILED", error.message));
  }
}

export async function listSellerOrdersController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const sellerId = payload?.sub;
    if (!sellerId) {
      response.status(401).json(fail("UNAUTHORIZED", "Missing or invalid token"));
      return;
    }
    const orders = await listSellerOrders(sellerId);
    response.json(ok(orders));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_SELLER_ORDERS_FAILED", error.message));
  }
}

// --- Cart Controllers ---

export async function getCartController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const buyerId = payload?.sub || DEFAULT_BUYER_ID;
    const cart = await getCart(buyerId);
    response.json(ok(cart));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_CART_FAILED", error.message));
  }
}

export async function addToCartController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const buyerId = payload?.sub || DEFAULT_BUYER_ID;
    const item = await addToCart(buyerId, request.body);
    response.status(201).json(ok(item));
  } catch (error: any) {
    response.status(400).json(fail("ADD_TO_CART_FAILED", error.message));
  }
}

export async function removeFromCartController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const buyerId = payload?.sub || DEFAULT_BUYER_ID;
    const result = await removeFromCart(buyerId, request.params.productId);
    response.json(ok(result));
  } catch (error: any) {
    response.status(500).json(fail("REMOVE_FROM_CART_FAILED", error.message));
  }
}

export async function updateCartItemController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const buyerId = payload?.sub || DEFAULT_BUYER_ID;
    const quantity = request.body.quantity;
    if (quantity == null) {
      response.status(400).json(fail("UPDATE_CART_FAILED", "Quantity is required"));
      return;
    }
    const item = await updateCartItemQuantity(buyerId, request.params.productId, quantity);
    response.json(ok(item));
  } catch (error: any) {
    response.status(500).json(fail("UPDATE_CART_FAILED", error.message));
  }
}

export async function clearCartController(request: Request, response: Response): Promise<void> {
  try {
    const payload = extractTokenPayload(request);
    const buyerId = payload?.sub || DEFAULT_BUYER_ID;
    const result = await clearCart(buyerId);
    response.json(ok(result));
  } catch (error: any) {
    response.status(500).json(fail("CLEAR_CART_FAILED", error.message));
  }
}
