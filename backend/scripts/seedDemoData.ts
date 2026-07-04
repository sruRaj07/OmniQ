import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL ERROR: EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env");
  process.exit(1);
}

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanDatabase() {
  console.log("\n--- Cleaning up existing database tables ---");
  
  // Order items must be deleted before orders due to foreign keys
  const { error: oie } = await supabaseAdmin.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (oie) console.log("Note deleting order_items:", oie.message);
  
  const { error: oe } = await supabaseAdmin.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (oe) console.log("Note deleting orders:", oe.message);
  
  const { error: cte } = await supabaseAdmin.from("cart_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (cte) console.log("Note deleting cart_items:", cte.message);
  
  const { error: pe } = await supabaseAdmin.from("products").delete().neq("id", "");
  if (pe) console.log("Note deleting products:", pe.message);
  
  const { error: se } = await supabaseAdmin.from("sellers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (se) console.log("Note deleting sellers:", se.message);
  
  const { error: pre } = await supabaseAdmin.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (pre) console.log("Note deleting profiles:", pre.message);
  
  const { error: ze } = await supabaseAdmin.from("delivery_zones").delete().neq("name", "");
  if (ze) console.log("Note deleting delivery_zones:", ze.message);
  
  console.log("Database cleanup finished.");
}

async function getOrCreateAuthUser(email: string, role: string) {
  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw listError;
  
  const existingUser = data.users.find(u => u.email === email);
  if (existingUser) {
    console.log(`Deleting existing auth user for email: ${email}`);
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    if (delError) console.error("Error deleting auth user:", delError.message);
  }
  
  console.log(`Creating fresh auth user: ${email} as ${role}`);
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { role }
  });
  
  if (createError) throw createError;
  return newUser.user;
}

async function createProfile(id: string, name: string, role: string, phone: string, address: string, pincode: string) {
  console.log(`Creating profile record for ${name} (${role})`);
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert({
      id,
      full_name: name,
      role,
      phone_number: phone,
      address,
      pincode
    })
    .select()
    .single();
    
  if (error) throw new Error(`Profile creation failed: ${error.message}`);
  return data;
}

async function createSeller(ownerId: string, businessName: string, category: string, city: string) {
  console.log(`Creating seller record for ${businessName}`);
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .insert({
      owner_id: ownerId,
      business_name: businessName,
      description: `Premium dealer in high quality ${category.toLowerCase()} items.`,
      gst_number: `29ABCDE1234F${Math.floor(100 + Math.random() * 900)}Z5`,
      category,
      city,
      status: "approved"
    })
    .select()
    .single();
    
  if (error) throw new Error(`Seller creation failed: ${error.message}`);
  return data;
}

async function seedDeliveryZones() {
  console.log("Inserting delivery zones...");
  const zones = [
    {
      name: "Bengaluru Central",
      lat: 12.9716,
      lng: 77.5946,
      radius_km: 15.00,
      supported_pincodes: ["560001", "560002", "560034", "560040", "560076", "560100"],
      active: true
    },
    {
      name: "Delhi Connaught Place",
      lat: 28.6304,
      lng: 77.2177,
      radius_km: 10.00,
      supported_pincodes: ["110001", "110002", "110005", "110055"],
      active: true
    }
  ];
  
  const { data, error } = await supabaseAdmin.from("delivery_zones").insert(zones).select();
  if (error) throw new Error(`Delivery zones seeding failed: ${error.message}`);
  console.log(`Seeded ${data.length} delivery zones.`);
  return data;
}

async function seedProducts(sellerId: string) {
  console.log("Inserting products...");
  const products = [
    {
      id: "omq-spices-01",
      seller_id: sellerId,
      title: "Premium Organic Turmeric Powder",
      description: "Pure and organic turmeric powder sourced directly from Salem, Tamil Nadu. Rich in curcumin (5%+ content) and perfect for daily cooking.",
      price: 249.00,
      compare_price: 299.00,
      category: "Spices",
      sku: "OMQ-SPICES-01",
      stock: 150,
      images: ["https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500"]
    },
    {
      id: "omq-tea-02",
      seller_id: sellerId,
      title: "Darjeeling First Flush Whole Leaf Tea",
      description: "Exquisite Darjeeling black tea. Freshly packed whole leaves offering a light, floral liquor with a distinct muscatel flavour profile.",
      price: 599.00,
      compare_price: 699.00,
      category: "Beverages",
      sku: "OMQ-TEA-02",
      stock: 80,
      images: ["https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500"]
    },
    {
      id: "omq-saree-03",
      seller_id: sellerId,
      title: "Handloom Banarasi Silk Saree",
      description: "Authentic handwoven Banarasi silk saree with traditional gold zari work. Elegantly designed, featuring custom ethnic borders and a rich pallu.",
      price: 4999.00,
      compare_price: 5999.00,
      category: "Clothing",
      sku: "OMQ-SAREE-03",
      stock: 15,
      images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500"]
    },
    {
      id: "omq-sweets-04",
      seller_id: sellerId,
      title: "Desi Ghee Mysore Pak (Special)",
      description: "Mouth-melting Mysore Pak made with pure, premium quality cow ghee, gram flour, and sugar. A festive delicacy prepared in the royal style.",
      price: 349.00,
      compare_price: 399.00,
      category: "Sweets",
      sku: "OMQ-SWEETS-04",
      stock: 200,
      images: ["https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=500"]
    }
  ];
  
  const { data, error } = await supabaseAdmin.from("products").insert(products).select();
  if (error) throw new Error(`Products seeding failed: ${error.message}`);
  console.log(`Seeded ${data.length} products.`);
  return data;
}

async function seedOrders(buyerId: string, sellerId: string, products: any[]) {
  console.log("Inserting sample orders...");
  
  const p1 = products[0]; // Turmeric (249)
  const p2 = products[1]; // Tea (599)
  const p3 = products[3]; // Mysore Pak (349)
  
  // Order 1: Delivered
  const subtotal1 = Number(p1.price) * 2 + Number(p2.price) * 1;
  const platformFee = 29;
  const total1 = subtotal1 + platformFee;
  
  const { data: order1, error: order1Error } = await supabaseAdmin
    .from("orders")
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      subtotal: subtotal1,
      platform_fee: platformFee,
      total: total1,
      delivery_address: {
        line1: "Flat 402, Royal Residency",
        line2: "Koramangala 3rd Block",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560034"
      },
      buyer_lat: 12.9348,
      buyer_lng: 77.6189,
      status: "delivered"
    })
    .select()
    .single();
    
  if (order1Error) throw order1Error;
  
  await supabaseAdmin.from("order_items").insert([
    {
      order_id: order1.id,
      product_id: p1.id,
      quantity: 2,
      unit_price: p1.price,
      subtotal: Number(p1.price) * 2
    },
    {
      order_id: order1.id,
      product_id: p2.id,
      quantity: 1,
      unit_price: p2.price,
      subtotal: Number(p2.price) * 1
    }
  ]);
  
  // Order 2: Pending
  const subtotal2 = Number(p3.price) * 3;
  const total2 = subtotal2 + platformFee;
  
  const { data: order2, error: order2Error } = await supabaseAdmin
    .from("orders")
    .insert({
      buyer_id: buyerId,
      seller_id: sellerId,
      subtotal: subtotal2,
      platform_fee: platformFee,
      total: total2,
      delivery_address: {
        line1: "C-12, Green Park Extension",
        line2: "Near Metro Gate 2",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110016"
      },
      buyer_lat: 28.55889,
      buyer_lng: 77.20278,
      status: "pending"
    })
    .select()
    .single();
    
  if (order2Error) throw order2Error;
  
  await supabaseAdmin.from("order_items").insert([
    {
      order_id: order2.id,
      product_id: p3.id,
      quantity: 3,
      unit_price: p3.price,
      subtotal: Number(p3.price) * 3
    }
  ]);
  
  console.log("Sample orders seeded.");
}

async function main() {
  console.log("Starting OmniQ Database Seeding...");
  
  await cleanDatabase();
  
  // 1. Create auth users
  const buyerUser = await getOrCreateAuthUser("buyer@omniq.com", "buyer");
  const sellerUser = await getOrCreateAuthUser("seller@omniq.com", "seller");
  const adminUser = await getOrCreateAuthUser("admin@omniq.com", "admin");
  
  // 2. Create profile records linked to auth users
  await createProfile(buyerUser.id, "Aarav Sharma", "buyer", "+919876543210", "Flat 402, Royal Residency, Koramangala, Bengaluru", "560034");
  await createProfile(sellerUser.id, "Rajesh Kumar", "seller", "+919876543211", "C-12, Okhla Industrial Area Phase 3, New Delhi", "110020");
  await createProfile(adminUser.id, "OmniQ Admin", "admin", "+919876543212", "Head Office, Sector 4, HSR Layout, Bengaluru", "560102");
  
  // 3. Create seller business profile
  const sellerObj = await createSeller(sellerUser.id, "Namaste Indian Spices & Crafts", "Spices", "New Delhi");
  
  // 4. Seed delivery zones
  await seedDeliveryZones();
  
  // 5. Seed products linked to the seller
  const products = await seedProducts(sellerObj.id);
  
  // 6. Seed orders checkouts
  await seedOrders(buyerUser.id, sellerObj.id, products);
  
  console.log("\n=======================================================");
  console.log("SUCCESS: OmniQ Database seeding completed successfully!");
  console.log("=======================================================\n");
  console.log("Seeded Users Available for testing:");
  console.log("  1. Buyer: buyer@omniq.com (Password: Password123!)");
  console.log("  2. Seller: seller@omniq.com (Password: Password123!)");
  console.log("  3. Admin: admin@omniq.com (Password: Password123!)");
  console.log("=======================================================\n");
}

main().catch(error => {
  console.error("\nCRITICAL SEEDING FAILURE:", error);
  process.exit(1);
});
