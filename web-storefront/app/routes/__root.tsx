import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import * as React from "react";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>OmniQ Enterprise Multi-Vendor Marketplace</title>
        <meta name="description" content="Shop groceries, electronics, and daily essentials from trusted local sellers with lightning-fast delivery." />
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, sans-serif; margin: 0; padding: 0; background-color: #F7F9FC; color: #111827; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #FFF; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .logo { font-size: 24px; font-weight: 900; color: #6C5DD3; text-decoration: none; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; margin-top: 24px; }
          .card { background: #FFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; text-decoration: none; color: inherit; display: flex; flex-direction: column; transition: transform 0.15s ease; }
          .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
          .card-img { width: 100%; aspect-ratio: 1; object-fit: cover; background: #F3F4F6; }
          .card-body { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
          .title { font-size: 16px; font-weight: 700; margin: 0; }
          .price { font-size: 20px; font-weight: 800; color: #111827; }
          .badge { display: inline-block; background: #EFF6FF; color: #3B82F6; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; width: fit-content; }
          .btn-primary { background: #6C5DD3; color: #FFF; font-weight: 700; padding: 14px 28px; border-radius: 30px; border: none; font-size: 16px; cursor: pointer; }
        `}} />
        <HeadContent />
      </head>
      <body>
        <header>
          <a href="/" class="logo">OmniQ ⚡</a>
          <div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#16A34A' }}>● Live High-Speed SSR Storefront</span>
          </div>
        </header>
        <div class="container">
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
