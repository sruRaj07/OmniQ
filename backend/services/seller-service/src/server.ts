/**
 * OmniQ seller service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { listSellersController, registerSellerController, updateSellerStatusController, getSellerByIdController, getMySellerProfileController, updateMySellerProfileController } from "./controllers/sellerController";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4003);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (_request, response) => response.json(ok({ service: "seller-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));
app.post("/sellers/register", registerSellerController);
app.get("/sellers/me", getMySellerProfileController);
app.patch("/sellers/me", updateMySellerProfileController);
app.get("/sellers", listSellersController);
app.get("/sellers/:id", getSellerByIdController);
app.patch("/sellers/:id/status", updateSellerStatusController);
app.delete("/sellers/:id", (_request, response) => response.json(ok({ deleted: true })));
app.listen(port, () => console.log(`OmniQ seller service running on ${port}`));
