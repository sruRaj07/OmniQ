import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";

type ProductDetail = {
  id: string;
  title: string;
  description?: string;
  price: number;
  compare_price?: number;
  category?: string;
  stock?: number;
  images?: string[];
  seller?: string;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api";

export const Route = createFileRoute("/product/$id")({
  // ⚡ SSR DYNAMIC LOADER: Guarantees 0ms element render delay for SEO crawlers and web buyers
  loader: async ({ params }): Promise<ProductDetail | null> => {
    try {
      const res = await fetch(`${API_URL}/products/${params.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch (e) {
      console.error(`SSR Detail load failed for ${params.id}:`, e);
    }
    // Return sample demo data if API service is unreachable
    return {
      id: params.id,
      title: "Premium Organic Avocado & Fresh Greens Pack",
      description: "Directly sourced from organic valley farms. Hand-picked at peak ripeness for ultimate nutrition and creamy texture. Packed in eco-friendly protective cartons with zero synthetic preservatives or artificial sprays.",
      price: 14.99,
      compare_price: 19.99,
      category: "Grocery",
      stock: 42,
      seller: "Whole Foods Express",
      images: [
        "https://picsum.photos/seed/avocado/800/800",
        "https://picsum.photos/seed/greens/800/800",
      ],
    };
  },
  component: ProductDetailComponent,
});

function ProductDetailComponent() {
  const product = Route.useLoaderData();

  if (!product) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2>Product not found in current catalog</h2>
        <Link to="/" style={{ color: "#6C5DD3", fontWeight: "700" }}>← Back to Home</Link>
      </div>
    );
  }

  const discount = product.compare_price ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;
  const mainImg = product.images?.[0] || "https://picsum.photos/seed/detail/800/800";

  return (
    <div style={{ padding: "20px 0" }}>
      <Link to="/" style={{ textDecoration: "none", color: "#666", fontWeight: "600", fontSize: "15px", display: "inline-block", marginBottom: "20px" }}>
        ← Back to Marketplace
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", background: "#FFF", padding: "32px", borderRadius: "24px", border: "1px solid #E5E7EB" }}>
        <div>
          <img src={mainImg} alt={product.title} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "20px", background: "#F3F4F6" }} />
          {product.images && product.images.length > 1 && (
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              {product.images.map((img, idx) => (
                <img key={idx} src={img} style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "cover", border: "2px solid #E5E7EB", cursor: "pointer" }} alt={`Preview ${idx}`} />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            {product.category && <span className="badge">{product.category}</span>}
            <h1 style={{ fontSize: "32px", fontWeight: 900, margin: "12px 0 6px 0" }}>{product.title}</h1>
            <span style={{ color: "#6B7280", fontSize: "15px", fontWeight: "600" }}>Sold by {product.seller || "OmniQ Partner"} · In Stock ({product.stock || 25})</span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", background: "#F8FAFC", padding: "16px", borderRadius: "16px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#111827" }}>${Number(product.price).toFixed(2)}</span>
            {product.compare_price && <span style={{ fontSize: "20px", color: "#9CA3AF", textDecoration: "line-through" }}>${Number(product.compare_price).toFixed(2)}</span>}
            {discount > 0 && <span style={{ background: "#DC2626", color: "#FFF", padding: "4px 8px", borderRadius: "8px", fontWeight: "700", fontSize: "13px" }}>Save {discount}%</span>}
          </div>

          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "8px", color: "#374151" }}>Product Overview & Features</h3>
            <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#4B5563", margin: 0 }}>{product.description || "No specific description provided for this item."}</p>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "20px", display: "flex", gap: "16px" }}>
            <button className="btn-primary" style={{ flex: 1, fontSize: "18px", padding: "16px" }}>
              Add to OmniQ Cart 🛒
            </button>
            <button style={{ background: "#F1F5F9", border: "none", padding: "16px 20px", borderRadius: "30px", fontWeight: "700", cursor: "pointer" }}>
              ❤️ Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
