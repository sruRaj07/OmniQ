/**
 * OmniQ admin service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { requireRole } from "../../../shared/utils/gatewayIdentity";
import { analyticsController, dashboardController, moderateProductController, zoneController, deleteZoneController, listZonesController, listAllOrdersController, listUserRequestsController, actionUserRequestController, listFlaggedProductsController, listAuditLogController } from "./controllers/adminController";
import { createAdvertisementController, deleteAdvertisementController, listAdvertisementsController, updateAdvertisementController } from "./controllers/advertisementController";
import multer from "multer";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4006);
const upload = multer({ storage: multer.memoryStorage() });
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (_request, response) => response.json(ok({ service: "admin-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));

// SECURITY: this service performs administrative reads and writes over every customer's orders,
// addresses and phone numbers. It previously had no authorisation of any kind and relied entirely
// on the gateway, which itself did not verify token signatures. Every route below now independently
// requires an admin identity issued by the gateway, so exposure of this service is not sufficient
// to read customer data. Applied before the route table so a new route cannot be added unguarded.
app.use("/admin", requireRole("admin"));

app.get("/admin/dashboard", dashboardController);
app.get("/admin/analytics", analyticsController);
app.get("/admin/flagged-products", listFlaggedProductsController);
app.patch("/admin/products/:id/moderate", moderateProductController);
app.get("/admin/zones", listZonesController);
app.post("/admin/zones", zoneController);
app.delete("/admin/zones/:id", deleteZoneController);
app.get("/admin/orders", listAllOrdersController);
app.get("/admin/audit-log", listAuditLogController);
app.get("/admin/advertisements", listAdvertisementsController);
app.post("/admin/advertisements", upload.single("image"), createAdvertisementController);
app.patch("/admin/advertisements/:id", upload.single("image"), updateAdvertisementController);
app.delete("/admin/advertisements/:id", deleteAdvertisementController);
app.get("/admin/user-requests", listUserRequestsController);
app.patch("/admin/user-requests/:id", actionUserRequestController);
app.listen(port, "0.0.0.0", () => console.log(`OmniQ admin service running on ${port}`));
