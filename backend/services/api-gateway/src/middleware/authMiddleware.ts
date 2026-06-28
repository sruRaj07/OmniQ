/**
 * OmniQ API gateway - Supabase JWT auth middleware.
 * Author: OmniQ Team
 */
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { fail } from "../../../../shared/utils/responseFormatter";

export type AuthenticatedUser = {
  id: string;
  role: "buyer" | "seller" | "admin";
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export function authMiddleware(request: Request, response: Response, next: NextFunction): void {
  try {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      response.status(401).json(fail("UNAUTHORIZED", "Missing bearer token."));
      return;
    }
    const token = header.replace("Bearer ", "");
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== "object" || typeof decoded.sub !== "string") {
      response.status(401).json(fail("UNAUTHORIZED", "Invalid token."));
      return;
    }
    request.user = {
      id: decoded.sub,
      role: decoded.app_metadata?.role === "admin" ? "admin" : decoded.app_metadata?.role === "seller" ? "seller" : "buyer"
    };
    next();
  } catch {
    response.status(401).json(fail("UNAUTHORIZED", "Unable to verify token."));
  }
}
