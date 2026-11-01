/**
 * OmniQ order service - order business logic.
 * Author: OmniQ Team
 */
import { z } from "zod";
import { emitOrderStatusChanged } from "../events/orderEventEmitter";
import { computeDeliveryFee, calculateDeliveryFeeDetails } from "../../../../shared/constants/delivery";
import { supabaseAdmin } from "../../../../shared/utils/supabaseClient";
import { calculateTieredPrice } from "../../../../shared/utils/tieredPricing";

let hasOfferColumnsInOrderItems: boolean | null = null;
async function checkOrderItemsHasOfferColumns(): Promise<boolean> {
  if (hasOfferColumnsInOrderItems !== null) return hasOfferColumnsInOrderItems;
  try {
    const { error } = await supabaseAdmin.from("order_items").select("offer_qty").limit(0);
    hasOfferColumnsInOrderItems = !error;
  } catch {
    hasOfferColumnsInOrderItems = false;
  }
  return hasOfferColumnsInOrderItems;
}

let hasDeliveryColumnsInOrders: boolean | null = null;
async function checkOrdersHasDeliveryColumns(): Promise<boolean> {
  if (hasDeliveryColumnsInOrders !== null) return hasDeliveryColumnsInOrders;
  try {
    const { error } = await supabaseAdmin.from("orders").select("delivery_fee, distance_km, nearest_hub").limit(0);
    hasDeliveryColumnsInOrders = !error;
  } catch {
    hasDeliveryColumnsInOrders = false;
  }
  return hasDeliveryColumnsInOrders;
}

function distanceKmBetween(point: { lat: number; lng: number }, centre: { lat: number; lng: number }): number {
  const toRad = (value: number): number => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(centre.lat - point.lat);
  const dLng = toRad(centre.lng - point.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(point.lat)) * Math.cos(toRad(centre.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const orderCreateSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive().max(100) })).min(1).max(50),
  deliveryAddress: z.record(z.string(), z.string()),
  // Optional since v1.0. Kept in the schema so clients sending coords are supported.
  buyerLat: z.number().optional(),
  buyerLng: z.number().optional(),
  distanceKm: z.number().optional()
});


export const ORDER_STATUSES = ["pending", "packed", "dispatched", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Returns the order previously created under this idempotency key, or null if the key is new.
 * Claims the key atomically so concurrent replays cannot both proceed to create an order.
 */
async function claimIdempotencyKey(key: string, buyerId: string): Promise<{ replayed: any | null }> {
  const { error } = await supabaseAdmin.from("order_idempotency").insert({ key, buyer_id: buyerId });

  if (!error) return { replayed: null }; // Key is ours; proceed with creation.

  // 23505 = unique_violation: another request already claimed this key.
  if (error.code === "23505") {
    // SECURITY: scoped to buyer_id as well as key. The key is client-supplied, so without this a
    // caller who guessed or reused another customer's key would be handed that customer's order
    // row - delivery address, phone and totals included. A key belonging to someone else simply
    // does not match, and the request is rejected as in-progress rather than replayed.
    const { data: existing } = await supabaseAdmin
      .from("order_idempotency")
      .select("order_id")
      .eq("key", key)
      .eq("buyer_id", buyerId)
      .maybeSingle();

    if (existing?.order_id) {
      const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", existing.order_id).maybeSingle();
      if (order) return { replayed: order };
    }
    // Key claimed but the original attempt has not finished (or failed before linking an order).
    throw new Error("A checkout with this key is already in progress. Please retry in a moment.");
  }

  if (error.code === "42P01") {
    // Table missing - migration 004_order_idempotency.sql has not been applied.
    console.error("[order] order_idempotency table is missing; duplicate-order protection is INACTIVE.");
    return { replayed: null };
  }

  throw new Error(`Failed to record idempotency key: ${error.message}`);
}

export async function placeOrder(buyerId: string, input: unknown, idempotencyKey?: string) {
  const parsed = orderCreateSchema.parse(input);

  if (idempotencyKey) {
    const { replayed } = await claimIdempotencyKey(idempotencyKey, buyerId);
    if (replayed) return replayed;
  }

  // 1. Fetch details for the products. Only approved, in-stock products may be ordered - a client
  //    could otherwise order an unapproved or flagged listing by passing its id directly.
  const productIds = [...new Set(parsed.items.map((item) => item.productId))];
  if (productIds.length !== parsed.items.length) {
    throw new Error("Duplicate products in order. Combine them into a single line item.");
  }

  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("*")
    .in("id", productIds);

  if (productsError) throw new Error(`Failed to verify products: ${productsError.message}`);
  if (!products || products.length !== productIds.length) {
    throw new Error("One or more products in your cart are no longer available.");
  }

  // 2. Validate stock and compute prices. Prices come from the database, never from the client.
  let subtotal = 0;
  const resolvedItems: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    offer_price?: number;
    offer_qty?: number;
    regular_price?: number;
    regular_qty?: number;
    savings?: number;
  }> = [];

  for (const item of parsed.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found.`);
    if (product.is_approved === false) throw new Error("One or more products in your cart are no longer available.");
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${product.id}. Available: ${product.stock}, Requested: ${item.quantity}`);
    }

    // Pure deterministic tiered daily offer pricing
    const tieredPrice = calculateTieredPrice({
      quantity: item.quantity,
      price: Number(product.price),
      offerPrice: product.offer_price,
      offerLimitQty: product.offer_limit_qty,
      unit: product.unit
    });

    const itemSubtotal = tieredPrice.totalPrice;
    subtotal += itemSubtotal;

    resolvedItems.push({
      product_id: product.id,
      quantity: item.quantity,
      unit_price: Number(product.price),
      subtotal: itemSubtotal,
      offer_price: tieredPrice.offerPrice,
      offer_qty: tieredPrice.offerQty,
      regular_price: tieredPrice.regularPrice,
      regular_qty: tieredPrice.regularQty,
      savings: tieredPrice.totalSavings
    });
  }

  // A single order row carries exactly one seller_id. Previously the seller of the first product
  // was applied to the whole order, so items from other sellers were silently attributed to - and
  // fulfilled by - the wrong merchant. Reject rather than misattribute; splitting a cart into one
  // order per seller is a schema and UI change tracked separately.
  const sellerIds = [...new Set(products.map((p) => p.seller_id))];
  if (sellerIds.length > 1) {
    throw new Error("Your cart contains items from multiple sellers. Please check out one seller at a time.");
  }
  const sellerId = sellerIds[0];

  // Option C: Delivery is computed from server-side subtotal and distance from nearest inventory hub.
  let resolvedDistanceKm = parsed.distanceKm ?? 0;
  let nearestHubName: string | null = null;

  try {
    const { data: zones } = await supabaseAdmin
      .from("delivery_zones")
      .select("name, lat, lng, radius_km, supported_pincodes")
      .eq("active", true)
      .is("deleted_at", null);

    if (zones && zones.length > 0) {
      const pincode = parsed.deliveryAddress?.pincode ? String(parsed.deliveryAddress.pincode).trim() : "";

      if (parsed.buyerLat !== undefined && parsed.buyerLng !== undefined) {
        let minDist = Infinity;
        let closest = null;
        for (const zone of zones) {
          const d = distanceKmBetween({ lat: parsed.buyerLat, lng: parsed.buyerLng }, { lat: zone.lat, lng: zone.lng });
          if (d < minDist) {
            minDist = d;
            closest = zone;
          }
        }
        if (closest) {
          resolvedDistanceKm = Number(minDist.toFixed(1));
          nearestHubName = closest.name;
        }
      } else if (pincode) {
        const matched = zones.find((z) => z.supported_pincodes && z.supported_pincodes.includes(pincode));
        if (matched) {
          nearestHubName = matched.name;
          if (!resolvedDistanceKm) {
            resolvedDistanceKm = 2.5; // Default within-zone estimate
          }
        }
      }
    }
  } catch (err) {
    console.warn("[order] Failed to resolve distance from delivery zones:", err);
  }

  const deliveryDetails = calculateDeliveryFeeDetails(subtotal, resolvedDistanceKm);
  const deliveryFee = deliveryDetails.deliveryFee;
  const total = subtotal + deliveryFee;

  // 3. Reserve stock BEFORE creating the order, using a conditional update per item.
  //    `.gte("stock", quantity)` makes this compare-and-set: if a concurrent order consumed the
  //    stock between our read and this write, zero rows match and we know we lost the race. The
  //    previous read-then-write with a precomputed newStock allowed overselling under concurrency.
  const reserved: Array<{ product_id: string; quantity: number }> = [];
  try {
    for (const item of resolvedItems) {
      const { data: updated, error: stockError } = await supabaseAdmin
        .from("products")
        .update({ stock: (products.find((p) => p.id === item.product_id)!.stock as number) - item.quantity })
        .eq("id", item.product_id)
        .gte("stock", item.quantity)
        .select("id")
        .maybeSingle();

      if (stockError) throw new Error(`Failed to reserve stock: ${stockError.message}`);
      if (!updated) throw new Error(`Insufficient stock for product ${item.product_id}. Please review your cart.`);
      reserved.push({ product_id: item.product_id, quantity: item.quantity });
    }

    // 4. Create the order.
    const orderInsertPayload: any = {
      buyer_id: buyerId,
      seller_id: sellerId,
      subtotal,
      platform_fee: 0,
      total,
      delivery_address: parsed.deliveryAddress,
      buyer_lat: parsed.buyerLat ?? null,
      buyer_lng: parsed.buyerLng ?? null,
      status: "pending"
    };

    const hasDelivCols = await checkOrdersHasDeliveryColumns();
    if (hasDelivCols) {
      orderInsertPayload.delivery_fee = deliveryFee;
      orderInsertPayload.distance_km = resolvedDistanceKm;
      orderInsertPayload.nearest_hub = nearestHubName;
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert(orderInsertPayload)
      .select()
      .single();


    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

    // 5. Create the line items.
    const hasOfferCols = await checkOrderItemsHasOfferColumns();
    const lineItemRows = resolvedItems.map((item) => {
      const row: any = {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal
      };
      if (hasOfferCols) {
        row.offer_price = item.offer_price ?? null;
        row.offer_qty = item.offer_qty ?? 0;
        row.regular_price = item.regular_price ?? item.unit_price;
        row.regular_qty = item.regular_qty ?? item.quantity;
        row.savings = item.savings ?? 0;
      }
      return row;
    });

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(lineItemRows);

    if (itemsError) {
      // Roll the order back so a half-written order never reaches the seller.
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // 6. Link the idempotency key to the finished order so replays return it.
    if (idempotencyKey) {
      await supabaseAdmin.from("order_idempotency").update({ order_id: order.id }).eq("key", idempotencyKey);
    }

    return order;
  } catch (error) {
    // Compensate: release any stock reserved before the failure.
    for (const item of reserved) {
      const { data: current } = await supabaseAdmin.from("products").select("stock").eq("id", item.product_id).maybeSingle();
      if (current) {
        await supabaseAdmin
          .from("products")
          .update({ stock: Number(current.stock) + item.quantity })
          .eq("id", item.product_id);
      }
    }
    // Release the key so the customer can retry checkout rather than being locked out.
    if (idempotencyKey) {
      await supabaseAdmin.from("order_idempotency").delete().eq("key", idempotencyKey);
    }
    throw error;
  }
}

/**
 * Updates an order's status. `actor` must be the seller who owns the order, or an admin.
 * This previously took only an orderId and applied any status to any order for any caller, so a
 * buyer could mark their own order delivered, or tamper with another customer's order entirely.
 */
export async function updateOrderStatus(orderId: string, status: string, actor: { id: string; role: string }) {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    throw new Error(`Invalid status. Expected one of: ${ORDER_STATUSES.join(", ")}`);
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("id, seller_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) throw new Error(`Failed to load order: ${fetchError.message}`);
  if (!order) throw new Error("Order not found");

  if (actor.role !== "admin") {
    const { data: seller } = await supabaseAdmin
      .from("sellers")
      .select("id")
      .eq("owner_id", actor.id)
      .maybeSingle();

    if (!seller || seller.id !== order.seller_id) {
      throw new Error("You do not have permission to update this order.");
    }
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
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

  // 4. Mark the order cancelled rather than deleting it.
  //    Cancellation previously hard-deleted the order and its line items. That destroys a
  //    transactional record the business is expected to be able to produce (tax, dispute and
  //    accounting purposes), leaves the customer with no cancellation history, and makes the
  //    stock refund above unauditable. The schema already models this state: status 'cancelled'.
  const { data: cancelled, error: cancelError } = await supabaseAdmin
    .from("orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending") // Re-check under write: the seller may have just packed it.
    .select()
    .maybeSingle();

  if (cancelError) throw new Error(`Failed to cancel order: ${cancelError.message}`);
  if (!cancelled) throw new Error("Only pending orders can be cancelled");

  emitOrderStatusChanged(orderId, "cancelled");
  return cancelled;
}

export async function listOrders(buyerId: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*, product:products(*))")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return data;
}

export async function listSellerOrders(ownerId: string) {
  const { data: seller, error: sellerError } = await supabaseAdmin
    .from("sellers")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (sellerError) throw new Error(`Failed to verify seller profile: ${sellerError.message}`);
  if (!seller) return []; // If no seller profile, they have no orders

  const { data, error } = await supabaseAdmin
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
  const { data, error } = await supabaseAdmin
    .from("cart_items")
    .select("*, product:products(*)")
    .eq("buyer_id", buyerId);

  if (error) throw new Error(`Failed to fetch cart: ${error.message}`);
  return data;
}

export async function addToCart(buyerId: string, input: unknown) {
  const parsed = cartItemSchema.parse(input);

  // Check if item already exists in cart
  const { data: existing } = await supabaseAdmin
    .from("cart_items")
    .select("*")
    .eq("buyer_id", buyerId)
    .eq("product_id", parsed.productId)
    .single();

  if (existing) {
    // Update quantity
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity: existing.quantity + parsed.quantity })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update cart item: ${error.message}`);
    return data;
  } else {
    // Insert new item
    const { data, error } = await supabaseAdmin
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
  const { error } = await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("buyer_id", buyerId)
    .eq("product_id", productId);

  if (error) throw new Error(`Failed to remove item from cart: ${error.message}`);
  return { deleted: true };
}

export async function updateCartItemQuantity(buyerId: string, productId: string, quantity: number) {
  const { data, error } = await supabaseAdmin
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
  const { error } = await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("buyer_id", buyerId);

  if (error) throw new Error(`Failed to clear cart: ${error.message}`);
  return { cleared: true };
}
