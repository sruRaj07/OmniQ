import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";

type Product = {
  id: string;
  title: string;
  price: number;
  category?: string;
  images?: string[];
  seller?: string;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api";

export const Route = createFileRoute("/")({
  // ⚡ SERVER-SIDE LOADER: Executes on TanStack Start server during SSR, returning complete data before DOM hydration
  loader: async (): Promise<Product[]> => {
    try {
      const res = await fetch(`${API_URL}/products?limit=20`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      console.error("SSR Catalog fetch failed:", e);
      // Fallback display product if API is booting up
      return [
        { id: "sample-1", title: "Premium Organic Avocado & Fresh Greens", price: 14.99, category: "Grocery", images: ["https://picsum.photos/seed/avocado/600/600"], seller: "Whole Foods Express" },
        { id: "sample-2", title: "Apple AirPods Pro 2nd Gen USB-C", price: 249.00, category: "Electronics", images: ["https://picsum.photos/seed/airpods/600/600"], seller: "TechCorp Global" },
        { id: "sample-3", title: "Stainless Steel Smart Thermal Flask", price: 34.50, category: "Kitchen", images: ["https://picsum.photos/seed/flask/600/600"], seller: "Modern Home" },
        { id: "sample-4", title: "Ergonomic Mechanical Wireless Keyboard", price: 129.99, category: "Electronics", images: ["https://picsum.photos/seed/keyboard/600/600"], seller: "Peripheral Pro" },
      ];
    }
  },
  component: IndexComponent,
});

function IndexComponent() {
  const products = Route.useLoaderData();

  return (
    <div>
      <div style={{ padding: '32px 24px', background: 'linear-gradient(135deg, #20134E 0%, #6C5DD3 100%)', borderRadius: '24px', color: '#FFF', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 12px 0' }}>Instantaneous Discovery. Zero Render Delay.</h1>
        <p style={{ fontSize: '18px', opacity: 0.9, margin: 0, maxWidth: '600px' }}>
          Powered by TanStack Start SSR & Expo Monorepo Architecture. Every product card is pre-rendered directly on the edge server.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Featured Marketplace Products</h2>
        <span style={{ fontSize: '15px', color: '#666', fontWeight: '600' }}>{products.length} Items Listed</span>
      </div>

      <div className="grid">
        {products.map((p) => {
          const imgUrl = p.images?.[0] || "https://picsum.photos/seed/fallback/600/600";
          return (
            <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="card">
              <img src={imgUrl} alt={p.title} className="card-img" loading="lazy" />
              <div className="card-body">
                {p.category && <span className="badge">{p.category}</span>}
                <h3 className="title">{p.title}</h3>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>By {p.seller || 'OmniQ Direct'}</span>
                <div className="price">${Number(p.price).toFixed(2)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
