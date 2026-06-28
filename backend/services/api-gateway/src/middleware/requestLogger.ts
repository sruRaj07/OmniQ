/**
 * OmniQ API gateway - request id middleware.
 * Author: OmniQ Team
 */
import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function attachRequestId(_request: Request, response: Response, next: NextFunction): void {
  response.locals.requestId = crypto.randomUUID();
  response.setHeader("X-Request-Id", response.locals.requestId as string);
  next();
}
