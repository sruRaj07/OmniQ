/**
 * OmniQ Web Entry (`index.web.tsx`).
 * 
 * On Web, users and SEO crawlers visiting `/` should immediately see the storefront
 * without waiting for artificial splash animations, auth network calls, or JS routing loops.
 * This ensures Expo Router builds the complete pre-rendered static HTML into `dist/index.html`,
 * yielding ~0ms Element Render Delay and instant LCP.
 * 
 * Author: OmniQ Team
 */
import BuyerHomeScreen from "./(buyer)/index";

export default BuyerHomeScreen;
