/**
 * OmniQ shared package - Express global error handler.
 * Author: OmniQ Team
 */
import type { ErrorRequestHandler } from "express";
import { fail } from "./responseFormatter";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const requestId = response.locals.requestId as string | undefined;
  response.status(500).json(fail("INTERNAL_SERVER_ERROR", "Unexpected server error.", requestId));
};
