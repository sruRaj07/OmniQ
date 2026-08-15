/**
 * OmniQ seller service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { requireAuth, requireRole } from "../../../shared/utils/gatewayIdentity";
import { listSellersController, registerSellerController, updateSellerStatusController, getSellerByIdController, getMySellerProfileController, updateMySellerProfileController } from "./controllers/sellerController";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4003);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.get("/health", (_request, response) => response.json(ok({ service: "seller-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));

// Authenticated: acting on your own seller record.
// `/sellers/me` must stay above `/sellers/:id` or "me" is matched as an id.
app.post("/sellers/register", requireAuth, registerSellerController);
app.get("/sellers/me", requireAuth, getMySellerProfileController);
app.patch("/sellers/me", requireAuth, updateMySellerProfileController);

// SECURITY: these return the full sellers row, including gst_number and business contact details.
// They were public and, at the gateway, cached for 60s - an anonymous GET /sellers dumped every
// seller's GST number. The only consumer is the admin console (frontend/src/app/(admin)/sellers.tsx),
// which needs pending sellers and GST to approve them, so admin-only is both correct and sufficient.
// There is no buyer-facing seller directory; product responses do not embed seller records.
app.get("/sellers", requireRole("admin"), listSellersController);
app.get("/sellers/:id", requireRole("admin"), getSellerByIdController);

// Admin only: this decides who is allowed to trade on the marketplace.
app.patch("/sellers/:id/status", requireRole("admin"), updateSellerStatusController);

// Removed: `app.delete("/sellers/:id", ...)` returned {deleted:true} without deleting anything and
// had no authorisation. A stub that reports success for a destructive operation is worse than no
// route at all - re-add it only with a real implementation behind requireRole("admin").
app.listen(port, "0.0.0.0", () => console.log(`OmniQ seller service running on ${port}`));
