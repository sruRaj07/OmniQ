import { cancelOrder, placeOrder } from "./services/order-service/src/services/orderService";
import { supabaseAdmin } from "./shared/utils/supabaseClient";

async function run() {
  try {
    // 1. Get a product
    const { data: product } = await supabaseAdmin.from("products").select("id").limit(1).single();
    if (!product) throw new Error("No product found");

    // 2. Create order
    const buyerId = "d00d0000-0000-0000-0000-000000000000";
    const orderInput = {
      items: [{ productId: product.id, quantity: 1 }],
      deliveryAddress: { line1: "test", city: "test", state: "test", pincode: "123456" },
      buyerLat: 0,
      buyerLng: 0
    };
    
    console.log("Placing order...");
    const order = await placeOrder(buyerId, orderInput);
    console.log("Order placed:", order.id);

    // 3. Cancel order
    console.log("Cancelling order...");
    const result = await cancelOrder(buyerId, order.id);
    console.log("Cancel result:", result);
  } catch (err: any) {
    console.error("ERROR:", err.message);
  }
}
run();
