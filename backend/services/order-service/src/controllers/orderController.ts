/**
 * OmniQ order service - HTTP controllers.
 * Author: OmniQ Team
 *
 * Identity comes from the gateway-verified headers on request.omniqUser (see
 * shared/utils/gatewayIdentity). These controllers previously base64-decoded the JWT payload
 * themselves - without any signature check - and fell back to a shared DEFAULT_BUYER_ID when no
 * token was present, so unauthenticated callers transacted as a single ghost account and could
 * read and mutate its cart and orders.
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { requireUserId } from "../../../../shared/utils/gatewayIdentity";
import {
  placeOrder,
  updateOrderStatus,
  listOrders,
  listSellerOrders,
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  updateCartItemQuantity,
  cancelOrder
} from "../services/orderService";

export async function placeOrderController(request: Request, response: Response): Promise<void> {
  try {
    const buyerId = requireUserId(request);
    const rawKey = request.header("idempotency-key");
    // Bound the key so a client cannot use it as arbitrary storage.
    const idempotencyKey = rawKey && /^[A-Za-z0-9._:-]{8,128}$/.test(rawKey) ? rawKey : undefined;
    if (rawKey && !idempotencyKey) {
      response.status(400).json(fail("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 8-128 characters of A-Z a-z 0-9 . _ : -"));
      return;
    }
    const order = await placeOrder(buyerId, request.body, idempotencyKey);
    response.status(201).json(ok(order));
  } catch (error: any) {
    response.status(400).json(fail("ORDER_VALIDATION_FAILED", error.message));
  }
}

export async function updateOrderStatusController(request: Request, response: Response): Promise<void> {
  try {
    const actor = request.omniqUser;
    if (!actor) {
      response.status(401).json(fail("UNAUTHORIZED", "Authentication is required."));
      return;
    }
    const order = await updateOrderStatus(request.params.id, String(request.body.status ?? "packed"), actor);
    response.json(ok(order));
  } catch (error: any) {
    const forbidden = /permission/i.test(error.message);
    response.status(forbidden ? 403 : 400).json(fail(forbidden ? "FORBIDDEN" : "ORDER_UPDATE_FAILED", error.message));
  }
}

export async function cancelOrderController(request: Request, response: Response): Promise<void> {
  try {
    const buyerId = requireUserId(request);
    const order = await cancelOrder(buyerId, request.params.id);
    response.json(ok(order));
  } catch (error: any) {
    response.status(400).json(fail("CANCEL_ORDER_FAILED", error.message));
  }
}

export async function listOrdersController(request: Request, response: Response): Promise<void> {
  try {
    const buyerId = requireUserId(request);
    const orders = await listOrders(buyerId);
    response.json(ok(orders));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_ORDERS_FAILED", error.message));
  }
}

export async function listSellerOrdersController(request: Request, response: Response): Promise<void> {
  try {
    const ownerId = requireUserId(request);
    const orders = await listSellerOrders(ownerId);
    response.json(ok(orders));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_SELLER_ORDERS_FAILED", error.message));
  }
}

// --- Cart Controllers ---

export async function getCartController(request: Request, response: Response): Promise<void> {
  try {
    const cart = await getCart(requireUserId(request));
    response.json(ok(cart));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_CART_FAILED", error.message));
  }
}

export async function addToCartController(request: Request, response: Response): Promise<void> {
  try {
    const item = await addToCart(requireUserId(request), request.body);
    response.status(201).json(ok(item));
  } catch (error: any) {
    response.status(400).json(fail("ADD_TO_CART_FAILED", error.message));
  }
}

export async function removeFromCartController(request: Request, response: Response): Promise<void> {
  try {
    const result = await removeFromCart(requireUserId(request), request.params.productId);
    response.json(ok(result));
  } catch (error: any) {
    response.status(500).json(fail("REMOVE_FROM_CART_FAILED", error.message));
  }
}

export async function updateCartItemController(request: Request, response: Response): Promise<void> {
  try {
    const quantity = request.body.quantity;
    if (quantity == null) {
      response.status(400).json(fail("UPDATE_CART_FAILED", "Quantity is required"));
      return;
    }
    const item = await updateCartItemQuantity(requireUserId(request), request.params.productId, Number(quantity));
    response.json(ok(item));
  } catch (error: any) {
    response.status(500).json(fail("UPDATE_CART_FAILED", error.message));
  }
}

export async function clearCartController(request: Request, response: Response): Promise<void> {
  try {
    const result = await clearCart(requireUserId(request));
    response.json(ok(result));
  } catch (error: any) {
    response.status(500).json(fail("CLEAR_CART_FAILED", error.message));
  }
}
