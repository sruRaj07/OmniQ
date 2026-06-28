/**
 * OmniQ order service - HTTP controllers.
 * Author: OmniQ Team
 */
import type { Request, Response } from "express";
import { fail, ok } from "../../../../shared/utils/responseFormatter";
import { placeOrder, updateOrderStatus, getCart, addToCart, removeFromCart, clearCart } from "../services/orderService";

export async function placeOrderController(request: Request, response: Response): Promise<void> {
  try {
    const buyerId = "d00d0000-0000-0000-0000-000000000000"; // Hardcoded for testing
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

// --- Cart Controllers ---
const DUMMY_BUYER_ID = "d00d0000-0000-0000-0000-000000000000";

export async function getCartController(_request: Request, response: Response): Promise<void> {
  try {
    const cart = await getCart(DUMMY_BUYER_ID);
    response.json(ok(cart));
  } catch (error: any) {
    response.status(500).json(fail("FETCH_CART_FAILED", error.message));
  }
}

export async function addToCartController(request: Request, response: Response): Promise<void> {
  try {
    const item = await addToCart(DUMMY_BUYER_ID, request.body);
    response.status(201).json(ok(item));
  } catch (error: any) {
    response.status(400).json(fail("ADD_TO_CART_FAILED", error.message));
  }
}

export async function removeFromCartController(request: Request, response: Response): Promise<void> {
  try {
    const result = await removeFromCart(DUMMY_BUYER_ID, request.params.productId);
    response.json(ok(result));
  } catch (error: any) {
    response.status(500).json(fail("REMOVE_FROM_CART_FAILED", error.message));
  }
}

export async function clearCartController(_request: Request, response: Response): Promise<void> {
  try {
    const result = await clearCart(DUMMY_BUYER_ID);
    response.json(ok(result));
  } catch (error: any) {
    response.status(500).json(fail("CLEAR_CART_FAILED", error.message));
  }
}
