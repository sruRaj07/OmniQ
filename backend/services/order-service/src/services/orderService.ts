/**
 * OmniQ order service - order business logic.
 * Author: OmniQ Team
 */
import { z } from "zod";
import { emitOrderStatusChanged } from "../events/orderEventEmitter";
import { supabase } from "../../../../shared/utils/supabaseClient";

export const orderCreateSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
  deliveryAddress: z.record(z.string(), z.string()),
  buyerLat: z.number(),
  buyerLng: z.number()
});

export async function placeOrder(buyerId: string, input: unknown) {
  const parsed = orderCreateSchema.parse(input);
  
  // Calculate mock totals since we don't have product prices in this payload
  const subtotal = parsed.items.length * 1999;
  const platformFee = 29;
  const total = subtotal + platformFee;

  // 1. Insert into orders table
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: buyerId,
      subtotal,
      platform_fee: platformFee,
      total,
      delivery_address: parsed.deliveryAddress,
      buyer_lat: parsed.buyerLat,
      buyer_lng: parsed.buyerLng,
      status: "pending"
    })
    .select()
    .single();

  if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

  // 2. Insert into order_items table
  const orderItems = parsed.items.map(item => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    // Ideally we would rollback the order here or use a database function
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  return order;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update order status: ${error.message}`);
  
  emitOrderStatusChanged(orderId, status);
  return data;
}

// --- Cart Logic ---

export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive()
});

export async function getCart(buyerId: string) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("buyer_id", buyerId);

  if (error) throw new Error(`Failed to fetch cart: ${error.message}`);
  return data;
}

export async function addToCart(buyerId: string, input: unknown) {
  const parsed = cartItemSchema.parse(input);

  // Check if item already exists in cart
  const { data: existing } = await supabase
    .from("cart_items")
    .select("*")
    .eq("buyer_id", buyerId)
    .eq("product_id", parsed.productId)
    .single();

  if (existing) {
    // Update quantity
    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + parsed.quantity })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update cart item: ${error.message}`);
    return data;
  } else {
    // Insert new item
    const { data, error } = await supabase
      .from("cart_items")
      .insert({
        buyer_id: buyerId,
        product_id: parsed.productId,
        quantity: parsed.quantity
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to add to cart: ${error.message}`);
    return data;
  }
}

export async function removeFromCart(buyerId: string, productId: string) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("buyer_id", buyerId)
    .eq("product_id", productId);

  if (error) throw new Error(`Failed to remove item from cart: ${error.message}`);
  return { deleted: true };
}

export async function clearCart(buyerId: string) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("buyer_id", buyerId);

  if (error) throw new Error(`Failed to clear cart: ${error.message}`);
  return { cleared: true };
}
