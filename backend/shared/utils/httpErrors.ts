/**
 * OmniQ shared package - terminal 404 and error middleware.
 *
 * No service registered either, so both fell through to Express's built-in handlers, which answer
 * in HTML:
 *
 *   GET /orders/does-not-exist
 *   content-type: text/html
 *   <!DOCTYPE html> ... <pre>Cannot GET /orders/does-not-exist</pre>
 *
 * Every caller in this codebase unwraps `response.data?.data`, so an HTML body reads as a plain
 * string with no `.data` and no `.error` - the request looks like it returned nothing rather than
 * like it failed. That is the shape that made a missing admin route present as an empty console
 * instead of an error. An unhandled throw was worse: Express's default error handler returns the
 * stack trace in the body outside production.
 *
 * Mount both after all routes, 404 first: `app.use(notFoundHandler)` then `app.use(errorHandler)`.
 *
 * Author: OmniQ Team
 */
import type { NextFunction, Request, Response } from "express";
import { fail } from "./responseFormatter";

/** Terminal middleware: nothing matched the path. */
export function notFoundHandler(request: Request, response: Response): void {
  response.status(404).json(
    fail("NOT_FOUND", `No route matches ${request.method} ${request.path}.`, response.locals?.requestId)
  );
}

/**
 * Terminal error middleware. Express identifies this by its four-parameter arity, so `next` must
 * stay in the signature even though it is unused.
 */
export function errorHandler(
  error: any,
  request: Request,
  response: Response,
  _next: NextFunction
): void {
  // The full error - stack included - goes to the logs. Only a sanitised message goes to the client;
  // see sanitiseErrorMessage in responseFormatter.
  console.error(`[error] ${request.method} ${request.originalUrl}:`, error);

  // A response already streaming cannot be replaced with JSON; all that is left is to cut it off so
  // the client sees a broken connection rather than a half-written body it might parse as valid.
  if (response.headersSent) {
    response.destroy();
    return;
  }

  // Body-parser and multer set a status on the error; honour it rather than reporting 500 for what
  // is really a malformed request. Anything outside 4xx/5xx is our fault, so it becomes a 500.
  const status = Number(error?.status ?? error?.statusCode);
  const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;

  response
    .status(safeStatus)
    .json(
      fail(
        error?.code && typeof error.code === "string" ? error.code : "SERVER_ERROR",
        safeStatus >= 500
          ? "Something went wrong on our end. Please try again."
          : String(error?.message ?? "The request could not be processed."),
        response.locals?.requestId
      )
    );
}
