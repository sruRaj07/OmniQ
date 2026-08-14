/**
 * OmniQ order service - order business logic.
 * Author: OmniQ Team
 */
import { z } from "zod";
import { emitOrderStatusChanged } from "../events/orderEventEmitter";
import { supabase, supabaseAdmin } from "../../../../shared/utils/supabaseClient";

export const orderCreateSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
  deliveryAddress: z.record(z.string(), z.string()),
  buyerLat: z.number(),
  buyerLng: z.number()
});

export async function placeOrder(buyerId: string, input: unknown) {
  const parsed = orderCreateSchema.parse(input);
  
  // 1. Fetch details for the products
  const productIds = parsed.items.map(item => item.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price, seller_id, stock")
    .in("id", productIds);

  if (productsError) throw new Error(`Failed to verify products: ${productsError.message}`);
  if (!products || products.length === 0) throw new Error("No valid products found for the order.");

  // 2. Validate stock, calculate prices, and build order items
  let subtotal = 0;
  const resolvedItems: any[] = [];
  const sellerId = products[0].seller_id; // Order is placed with the seller of the first product

  for (const item of parsed.items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found.`);
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${product.id}. Available: ${product.stock}, Requested: ${item.quantity}`);
    }
    
    const itemSubtotal = Number(product.price) * item.quantity;
    subtotal += itemSubtotal;
    
    resolvedItems.push({
      product_id: product.id,
      quantity: item.quantity,
      unit_price: product.price,
      subtotal: itemSubtotal,
      newStock: product.stock - item.quantity
    });
  }

  const total = subtotal;

  // 3. Insert into orders table (with seller_id)
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      subtotal,
      platform_fee: 0,
      total,
      delivery_address: parsed.deliveryAddress,
      buyer_lat: parsed.buyerLat,
      buyer_lng: parsed.buyerLng,
      status: "pending"
    })
    .select()
    .single();

  if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

  // 4. Insert into order_items table (with unit_price & subtotal)
  const orderItems = resolvedItems.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    // Note: In production we would delete the order or use database transactions to rollback
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  // 5. Decrement stock for purchased products
  for (const item of resolvedItems) {
    await supabase
      .from("products")
      .update({ stock: item.newStock })
      .eq("id", item.product_id);
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

export async function cancelOrder(buyerId: string, orderId: string) {
  // 1. Fetch order and verify ownership/status
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Order not found");
  if (order.buyer_id !== buyerId) throw new Error("Unauthorized");
  if (order.status !== "pending") throw new Error("Only pending orders can be cancelled");

  // 2. Check 12-hour cutoff rule
  const createdAt = new Date(order.created_at);
  const hour = createdAt.getHours();
  const deliveryStart = new Date(createdAt);
  deliveryStart.setHours(12, 0, 0, 0);
  if (hour >= 12) {
    deliveryStart.setDate(deliveryStart.getDate() + 1);
  }
  
  const cutoffTime = new Date(deliveryStart.getTime() - 12 * 60 * 60 * 1000);
  
  if (new Date() >= cutoffTime) {
    throw new Error("Order can no longer be cancelled (past 12-hour cutoff)");
  }

  // 3. Refund stock
  for (const item of order.order_items) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .single();
    
    if (product) {
      await supabaseAdmin
        .from("products")
        .update({ stock: product.stock + item.quantity })
        .eq("id", item.product_id);
    }
  }

  // 4. Delete order items explicitly (in case CASCADE is not set)
  await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);

  // 5. Delete the order from the database entirely
  const { error: deleteError } = await supabaseAdmin
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (deleteError) throw new Error(`Failed to delete order: ${deleteError.message}`);

  emitOrderStatusChanged(orderId, "cancelled");
  return { id: orderId, status: "cancelled", deleted: true };
}

export async function listOrders(buyerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, product:products(*))")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return data;
}

export async function listSellerOrders(ownerId: string) {
  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (sellerError) throw new Error(`Failed to verify seller profile: ${sellerError.message}`);
  if (!seller) return []; // If no seller profile, they have no orders

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, product:products(*))")
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch seller orders: ${error.message}`);
  return data || [];
}

// --- Cart Logic ---

export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive()
});

export async function getCart(buyerId: string) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*, product:products(*)")
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

export async function updateCartItemQuantity(buyerId: string, productId: string, quantity: number) {
  const { data, error } = await supabase
    .from("cart_items")
    .update({ quantity: Math.max(1, quantity) })
    .eq("buyer_id", buyerId)
    .eq("product_id", productId)
    .select("*, product:products(*)")
    .single();

  if (error) throw new Error(`Failed to update cart item quantity: ${error.message}`);
  return data;
}

export async function clearCart(buyerId: string) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("buyer_id", buyerId);

  if (error) throw new Error(`Failed to clear cart: ${error.message}`);
  return { cleared: true };
}
