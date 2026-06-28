/**
 * OmniQ admin service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { analyticsController, dashboardController, moderateProductController, zoneController } from "./controllers/adminController";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4006);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (_request, response) => response.json(ok({ service: "admin-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));
app.get("/admin/dashboard", dashboardController);
app.get("/admin/analytics", analyticsController);
app.get("/admin/flagged-products", (_request, response) => response.json(ok([])));
app.patch("/admin/products/:id/moderate", moderateProductController);
app.post("/admin/zones", zoneController);
app.get("/admin/audit-log", (_request, response) => response.json(ok([])));
app.listen(port, () => console.log(`OmniQ admin service running on ${port}`));
