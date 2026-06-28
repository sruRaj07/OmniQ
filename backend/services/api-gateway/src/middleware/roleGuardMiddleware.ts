/**
 * OmniQ API gateway - role guard middleware.
 * Author: OmniQ Team
 */
import type { NextFunction, Request, Response } from "express";
import { fail } from "../../../../shared/utils/responseFormatter";

export function roleGuard(roles: ReadonlyArray<"buyer" | "seller" | "admin">) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json(fail("FORBIDDEN", "You do not have access to this resource."));
      return;
    }
    next();
  };
}
