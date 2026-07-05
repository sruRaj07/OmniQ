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

  const platformFee = 29;
  const total = subtotal + platformFee;

  // 3. Insert into orders table (with seller_id)
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
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
