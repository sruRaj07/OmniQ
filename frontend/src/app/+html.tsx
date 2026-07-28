import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root web shell configuration (+html.tsx).
 * Optimized for fast First Contentful Paint (FCP) and Largest Contentful Paint (LCP):
 *  1. Critical inline CSS (background, font stack, layout) — no external stylesheet blocking
 *  2. DNS prefetch + preconnect to Supabase and API backends
 *  3. ScrollView style resets to prevent layout shift
 *
 * Author: OmniQ Team
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* SEO */}
        <title>OmniQ — Shop the Future</title>
        <meta name="description" content="OmniQ is a multi-vendor marketplace connecting buyers and sellers. Browse thousands of products, manage your store, and shop the future." />

        {/* ⚡ PRECONNECT: Establish early TCP+TLS connections to critical origins */}
        <link rel="preconnect" href="https://xrhqopzudhuwgbmmsbtz.supabase.co" />
        <link rel="dns-prefetch" href="https://xrhqopzudhuwgbmmsbtz.supabase.co" />
        <link rel="preconnect" href="https://api-gateway.redbay-317d5a3d.eastus.azurecontainerapps.io" />
        <link rel="dns-prefetch" href="https://api-gateway.redbay-317d5a3d.eastus.azurecontainerapps.io" />

        {/* ⚡ LCP PRELOAD: Immediately fetch the HeroBanner LCP image in the very first roundtrip */}
        <link rel="preload" as="image" href="https://cdn3d.iconscout.com/3d/premium/thumb/gift-box-4993510-4161745.png" />

        {/* ⚡ CRITICAL CSS: Inline styles to eliminate render-blocking stylesheet fetches */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *,*::before,*::after{box-sizing:border-box}
              html{height:100%;-webkit-text-size-adjust:100%}
              body{
                min-height:100%;
                margin:0;
                padding:0;
                background-color:#FCFCFA;
                font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
                -webkit-font-smoothing:antialiased;
                -moz-osx-font-smoothing:grayscale;
                overflow-y:scroll;
              }
              #root{display:flex;flex-direction:column;min-height:100vh}
              input,textarea{font-size:16px!important}
              img,video{max-width:100%;height:auto}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
