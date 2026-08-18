/**
 * OmniQ shared package - graceful HTTP shutdown on SIGTERM/SIGINT.
 *
 * Node's default action for SIGTERM is to exit immediately, and no service installed a handler.
 * That cost us in two places:
 *
 *   Production - Azure Container Apps sends SIGTERM whenever it scales a replica down or swaps one
 *   during a deploy, then waits before SIGKILL. Exiting on the first signal severed every in-flight
 *   request, so a deploy or a scale-down surfaced to the caller as a dropped connection rather than
 *   as a completed response.
 *
 *   Development - `tsx watch` restarts a service by signalling it and starting the replacement. The
 *   dying process still held its listening socket, so the new one raced it and crashed with
 *   EADDRINUSE, leaving the port unserved until a later reload happened to win.
 *
 * Closing the listener stops new connections while letting in-flight ones finish, which fixes both.
 * The timeout is the backstop: a request that will not end must not hold the process open past the
 * platform's SIGKILL, or the shutdown looks like a hang.
 *
 * Author: OmniQ Team
 */
import type { Server } from "node:http";

/** Container Apps' termination grace period is 30s by default; finish well inside it. */
const FORCE_EXIT_MS = 10_000;

export function installGracefulShutdown(server: Server, serviceName: string): void {
  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    // A platform that sends SIGTERM twice, or a Ctrl-C held down, must not start two shutdowns.
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[${serviceName}] ${signal} received, closing listener and draining requests`);

    // Fires once every in-flight response has ended.
    server.close((error) => {
      if (error) {
        console.error(`[${serviceName}] error while closing:`, error.message);
        process.exit(1);
      }
      console.log(`[${serviceName}] closed cleanly`);
      process.exit(0);
    });

    // Idle keep-alive sockets would otherwise hold `close` open for their full timeout even though
    // they carry no request. Available on Node 18.2+.
    server.closeIdleConnections?.();

    const timer = setTimeout(() => {
      console.warn(`[${serviceName}] requests still in flight after ${FORCE_EXIT_MS}ms, forcing exit`);
      process.exit(1);
    }, FORCE_EXIT_MS);

    // Do not let the backstop timer itself keep the event loop alive.
    timer.unref?.();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
