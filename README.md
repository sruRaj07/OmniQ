# OmniQ

OmniQ is a React Native + React + Node.js monorepo for an India-first multi-vendor ecommerce marketplace. It includes buyer and seller mobile flows, a separate admin SPA, Express microservice foundations, and Supabase migrations with RLS.

## Structure

- `frontend`: Expo Router mobile app for buyers and sellers.
- `admin`: Vite React admin panel.
- `backend/services`: Express services behind an API gateway.
- `backend/shared`: shared API response, logging, constants, and types.
- `supabase`: SQL migrations, RLS policies, local config, and seed data.

## Setup

1. Install pnpm and Node.js 20.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env` and fill Supabase, Redis, Maps, and service URLs.
4. Apply Supabase migrations from `supabase/migrations`.
5. Start mobile with `pnpm dev:frontend`, admin with `pnpm dev:admin`, and gateway with `pnpm dev:api`.

## Local Commands

- `pnpm dev`: starts the frontend and admin apps.
- `pnpm dev:frontend`: starts the Expo mobile app.
- `pnpm --filter frontend dev:go`: starts Expo on LAN for Expo Go phone preview.
- `pnpm --filter frontend dev:tunnel`: starts Expo through a tunnel if your phone is not on the same Wi-Fi.
- `pnpm build`: builds all workspaces.
- `pnpm typecheck`: runs TypeScript checks.
- `pnpm test`: runs backend tests where configured.

## Preview With Expo Go

1. Install Expo Go on your iOS or Android phone.
2. Use Node.js 20.x for the smoothest setup.
3. If Corepack prompts or fails, run `COREPACK_HOME=.corepack pnpm install` from the repository root.
4. Run `pnpm --filter frontend dev:go`.
5. Scan the QR code shown in the terminal with Expo Go. Keep your computer and phone on the same Wi-Fi.
6. If LAN does not connect, run `pnpm --filter frontend dev:tunnel` and scan the new QR code.

The first screen opens at the OmniQ sign-in preview. Use "Browse without signing in" for the buyer app, "Admin portal" for the admin login preview, and Profile -> "Open Seller Portal" for the seller flow.

## Deployment

- Expo EAS builds the mobile app from `frontend`.
- Vercel deploys `admin` with SPA rewrites.
- Render deploys each backend service. Keep downstream services private and expose only `api-gateway`.
