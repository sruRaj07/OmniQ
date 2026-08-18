/**
 * OmniQ user service - Express server.
 * Author: OmniQ Team
 */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { ok } from "../../../shared/utils/responseFormatter";
import { requireAuth, requireRole } from "../../../shared/utils/gatewayIdentity";
import { assignRoleController, meController, updateProfileController, createUserRequestController, getUserRequestsController, deleteAccountController } from "./controllers/userController";
import { signInController, signUpController, verifyOtpController } from "./controllers/authController";
import { installGracefulShutdown } from "../../../shared/utils/gracefulShutdown";
import { notFoundHandler, errorHandler } from "../../../shared/utils/httpErrors";

dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? 4004);
app.use(helmet());
app.use(cors());
// Profile payloads are small; an unbounded body is free memory pressure on a 0.5 vCPU container.
app.use(express.json({ limit: "100kb" }));
app.get("/health", (_request, response) => response.json(ok({ service: "user-service", status: "ok", uptime: process.uptime(), version: "1.0.0" })));

// SECURITY: every profile route reads or writes one specific user's personal data (name, email,
// phone, address, pincode). Guarded here as well as at the gateway so a route cannot be added
// without authentication and so the service is not safe only by virtue of its network position.
app.get("/users/me", requireAuth, meController);
app.get("/me", requireAuth, meController);
app.patch("/users/me", requireAuth, updateProfileController);
app.patch("/me", requireAuth, updateProfileController);

// Role assignment is an administrative action, not a self-service one.
app.post("/users/role", requireRole("admin"), assignRoleController);
app.post("/role", requireRole("admin"), assignRoleController);

app.post("/users/requests", requireAuth, createUserRequestController);
app.get("/users/requests", requireAuth, getUserRequestsController);

// Account deletion. Google Play requires an in-app path that actually deletes the account, plus a
// publicly reachable web URL that explains it (see docs/ACCOUNT_DELETION.md). The target is always
// the caller's own verified identity - there is no id in the path to tamper with.
app.delete("/users/me", requireAuth, deleteAccountController);
app.delete("/me", requireAuth, deleteAccountController);

// Auth Proxy Routes
app.post("/auth/signup", signUpController);
app.post("/signup", signUpController);
app.post("/auth/login", signInController);
app.post("/login", signInController);
app.post("/auth/verify-otp", verifyOtpController);
app.post("/verify-otp", verifyOtpController);


// Terminal handlers: must come after every route so they only see what nothing else matched.
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(port, "0.0.0.0", () => console.log(`OmniQ user service running on ${port}`));
installGracefulShutdown(server, "user-service");
