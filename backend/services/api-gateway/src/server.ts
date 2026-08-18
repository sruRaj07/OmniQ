/**
 * OmniQ API gateway - public entry point and proxy router.
 * Author: OmniQ Team
 */
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fail, ok } from "../../../shared/utils/responseFormatter";
import { installGracefulShutdown } from "../../../shared/utils/gracefulShutdown";
import { attachRequestId } from "./middleware/requestLogger";
import {
  globalLimiter,
  authLimiter,
  adminLimiter,
  orderLimiter,
  productListLimiter,
  zoneCheckLimiter
} from "./middleware/rateLimiterMiddleware";
import { authMiddleware, stripClientIdentityHeaders } from "./middleware/authMiddleware";
import { roleGuard } from "./middleware/roleGuardMiddleware";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const port = Number(process.env.PORT ?? 4000);
const isProduction = process.env.NODE_ENV === "production";

// SECURITY: an empty allow-list previously fell through to `origin: true`, which reflects any
// caller's Origin back with credentials: true - effectively disabling CORS. In production we now
// fail closed to same-origin instead. The native app does not use CORS, so this only affects web.
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ADMIN_URL]
  .filter((origin): origin is string => Boolean(origin))
  .flatMap((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean));

if (isProduction && allowedOrigins.length === 0) {
  console.warn("[cors] No FRONTEND_URL/ADMIN_URL configured; browser cross-origin requests will be refused.");
}

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : isProduction ? false : true,
  credentials: true
};

// SECURITY: must run before anything else so a client cannot inject its own identity headers.
app.use(stripClientIdentityHeaders);
app.use(attachRequestId);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
// Avoid writing Authorization headers or tokens to stdout.
app.use(morgan(isProduction ? "combined" : "dev", { skip: (_req, res) => isProduction && res.statusCode < 400 }));
app.use(globalLimiter);

app.get("/health", (_request, response) => {
  response.json(ok({ service: "api-gateway", status: "ok", uptime: process.uptime(), version: "1.0.0" }));
});

// Azure Container Apps runs these services with no `--min-replicas`, so the platform default of 0
// applies and an idle service is scaled to zero. The first request after an idle period therefore
// arrives while the container is still booting, and the upstream socket is refused outright.
//
// http-proxy-middleware's default error handler answered that with a plain-text
// "Error occurred while trying to proxy: ..." body under status 504. Two things went wrong with it:
// the body is not the { success, error } envelope every caller unwraps, so the console could not
// read a message out of it; and a refused connection fails in ~10ms, so the client burned its two
// retries (+1s, +2s) inside three seconds while the container needed five to thirty. The operator
// saw an empty admin console that fixed itself on a later reload - "sometimes it shows no data".
//
// 503 + Retry-After is the honest status for "this instance is not up yet, come back": it is
// retryable by contract, where 504 claims the upstream answered too slowly and it never answered.
const UPSTREAM_COLD_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "EAI_AGAIN"]);

// A cold start has to be waited out, not timed out. These bound a genuinely hung upstream while
// staying above the worst realistic Container Apps boot.
const PROXY_TIMEOUT_MS = 45_000; // waiting for the upstream to respond
const PROXY_CONNECT_TIMEOUT_MS = 45_000; // waiting for the upstream socket

const proxyConfig = (target: string) => ({
  target,
  changeOrigin: true,
  proxyTimeout: PROXY_TIMEOUT_MS,
  timeout: PROXY_CONNECT_TIMEOUT_MS,
  on: {
    error: (error: NodeJS.ErrnoException, request: any, responseOrSocket: any) => {
      // The third argument is a net.Socket for a WebSocket upgrade, which has no HTTP response to
      // write. Only a ServerResponse can be answered.
      if (!responseOrSocket || typeof responseOrSocket.status !== "function") {
        responseOrSocket?.destroy?.();
        return;
      }
      if (responseOrSocket.headersSent) {
        responseOrSocket.destroy();
        return;
      }

      const cold = UPSTREAM_COLD_CODES.has(error?.code ?? "");
      const requestId = responseOrSocket.locals?.requestId as string | undefined;
      console.error(
        `[gateway] proxy error ${error?.code ?? "UNKNOWN"} for ${request?.method} ${request?.originalUrl ?? request?.url} -> ${target}`
      );

      if (cold) {
        responseOrSocket.setHeader("Retry-After", "2");
        responseOrSocket
          .status(503)
          .json(
            fail(
              "UPSTREAM_UNAVAILABLE",
              "That service is starting up. Please try again in a moment.",
              requestId,
              2
            )
          );
        return;
      }

      responseOrSocket
        .status(504)
        .json(fail("UPSTREAM_TIMEOUT", "The upstream service did not respond in time.", requestId));
    }
  }
});

// ⚡ PERFORMANCE: In-memory response cache for public read endpoints.
// The previous implementation wrapped res.json, but http-proxy-middleware streams the upstream
// response straight to res.write/res.end and never calls res.json - so nothing was ever cached.
// This version buffers the streamed chunks instead, which works behind the proxy.
type CacheEntry = { body: Buffer; contentType: string; expiry: number };
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000;
const CACHE_MAX_ENTRIES = 500;

function cacheMiddleware(ttl = CACHE_TTL) {
  return (request: any, response: any, next: any) => {
    // Only ever cache anonymous public GETs. A request carrying credentials is per-user and must
    // never be written to, or served from, a shared cache.
    if (request.method !== "GET" || request.headers.authorization) return next();

    const key = request.originalUrl;
    const cached = responseCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      response.set("X-Cache", "HIT");
      response.set("Content-Type", cached.contentType);
      response.set("Cache-Control", `public, max-age=${Math.floor(ttl / 1000)}`);
      return response.send(cached.body);
    }
    if (cached) responseCache.delete(key);

    if (responseCache.size >= CACHE_MAX_ENTRIES) {
      const now = Date.now();
      for (const [k, v] of responseCache) {
        if (v.expiry <= now) responseCache.delete(k);
      }
      // Still full after pruning expired entries - evict oldest insertion (Map preserves order).
      while (responseCache.size >= CACHE_MAX_ENTRIES) {
        const oldest = responseCache.keys().next().value;
        if (oldest === undefined) break;
        responseCache.delete(oldest);
      }
    }

    const chunks: Buffer[] = [];
    const originalWrite = response.write.bind(response);
    const originalEnd = response.end.bind(response);

    response.write = (chunk: any, ...rest: any[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return originalWrite(chunk, ...rest);
    };

    response.end = (chunk: any, ...rest: any[]) => {
      if (chunk && typeof chunk !== "function") {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      if (response.statusCode >= 200 && response.statusCode < 300 && chunks.length > 0) {
        const body = Buffer.concat(chunks);
        // Guard against caching very large payloads in a memory-constrained container.
        if (body.byteLength <= 512 * 1024) {
          responseCache.set(key, {
            body,
            contentType: response.getHeader("content-type") ?? "application/json",
            expiry: Date.now() + ttl
          });
        }
      }
      return originalEnd(chunk, ...rest);
    };

    response.set("X-Cache", "MISS");
    next();
  };
}

const productTarget = process.env.PRODUCT_SERVICE_URL ?? "http://localhost:4001";
const orderTarget = process.env.ORDER_SERVICE_URL ?? "http://localhost:4002";
const sellerTarget = process.env.SELLER_SERVICE_URL ?? "http://localhost:4003";
const userTarget = process.env.USER_SERVICE_URL ?? "http://localhost:4004";
const locationTarget = process.env.LOCATION_SERVICE_URL ?? "http://localhost:4005";
const adminTarget = process.env.ADMIN_SERVICE_URL ?? "http://localhost:4006";

// --- Products ---
// A seller's own catalogue is per-user: it must be authenticated and never cached. Registered
// ahead of the public /products* GET so the wildcard cannot swallow it.
app.get("/products/seller", authMiddleware, createProxyMiddleware(proxyConfig(productTarget)));
app.get("/products*", productListLimiter, cacheMiddleware(60_000), createProxyMiddleware(proxyConfig(productTarget)));
app.all("/products*", authMiddleware, createProxyMiddleware(proxyConfig(productTarget)));

// --- Orders ---
app.post("/orders*", authMiddleware, orderLimiter, createProxyMiddleware(proxyConfig(orderTarget)));
app.all("/orders*", authMiddleware, createProxyMiddleware(proxyConfig(orderTarget)));

// --- Sellers ---
// SECURITY: there is no public seller route. GET /sellers* was previously unauthenticated AND
// cached for 60s, so an anonymous request returned every seller row - business name, city, GST
// number - and the gateway then served that response to further anonymous callers from memory.
// The only consumer is the admin console; /sellers/me is the caller's own record.
app.all("/sellers/me", authMiddleware, createProxyMiddleware(proxyConfig(sellerTarget)));
app.all("/sellers*", authMiddleware, createProxyMiddleware(proxyConfig(sellerTarget)));

// --- Users ---
app.all("/users*", authMiddleware, createProxyMiddleware(proxyConfig(userTarget)));

// --- Location ---
app.post("/location/zone-check", authMiddleware, zoneCheckLimiter, createProxyMiddleware(proxyConfig(locationTarget)));
app.get("/location*", cacheMiddleware(60_000), createProxyMiddleware(proxyConfig(locationTarget)));
app.all("/location*", authMiddleware, createProxyMiddleware(proxyConfig(locationTarget)));

// --- Admin ---
// SECURITY: roleGuard was previously defined but never applied, so any decodable token reached
// the admin service - which performs no authorisation of its own.
app.all("/admin*", authMiddleware, roleGuard(["admin"]), adminLimiter, createProxyMiddleware(proxyConfig(adminTarget)));

// --- Cart ---
app.all("/cart*", authMiddleware, createProxyMiddleware(proxyConfig(orderTarget)));

// --- Auth ---
// SECURITY: authLimiter existed but was never wired up, leaving login/signup throttled only by
// the 300-per-15-min global limit. These are unauthenticated credential endpoints.
app.all("/auth*", authLimiter, createProxyMiddleware(proxyConfig(userTarget)));

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`OmniQ API gateway running on ${port}`);
});

installGracefulShutdown(server, "api-gateway");
