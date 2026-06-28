/**
 * OmniQ user service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { assignRoleController, meController, updateProfileController } from "./controllers/userController";
import { signInController, signUpController, verifyOtpController } from "./controllers/authController";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4004);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (_request, response) => response.json(ok({ service: "user-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));
app.get("/users/me", meController);
app.get("/me", meController);
app.patch("/users/me", updateProfileController);
app.patch("/me", updateProfileController);
app.post("/users/role", assignRoleController);
app.post("/role", assignRoleController);

// Auth Proxy Routes
app.post("/auth/signup", signUpController);
app.post("/signup", signUpController);
app.post("/auth/login", signInController);
app.post("/login", signInController);
app.post("/auth/verify-otp", verifyOtpController);
app.post("/verify-otp", verifyOtpController);

app.listen(port, () => console.log(`OmniQ user service running on ${port}`));
