/**
 * OmniQ location service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { zoneCheckController } from "./controllers/locationController";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4005);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (_request, response) => response.json(ok({ service: "location-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));
app.post("/location/zone-check", zoneCheckController);
app.listen(port, () => console.log(`OmniQ location service running on ${port}`));
