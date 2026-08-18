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
import type cluster from "node:cluster";

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

/**
 * The cluster primary's version of the above.
 *
 * In cluster mode the workers do not own the listening socket - they ask the primary to bind it and
 * share the handle. So installing a handler on the workers alone does not free the port: the
 * primary keeps it until the primary itself exits. Under `tsx watch` that surfaced as the
 * replacement process dying on `bind EADDRINUSE 0.0.0.0:4001`, and in production it delays a
 * Container Apps replica swap until SIGKILL.
 *
 * The re-fork guard matters just as much. `cluster.on("exit")` replaces any worker that dies, which
 * is what keeps the service alive after a crash - but during shutdown every worker exits on
 * purpose, so an unguarded handler forks a fresh one each time and the process never drains. The
 * returned predicate lets the caller skip the replacement once shutdown has begun.
 */
export function installClusterPrimaryShutdown(
  clusterRef: typeof cluster,
  serviceName: string
): () => boolean {
  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;

    const workers = Object.values(clusterRef.workers ?? {}).filter(
      (worker): worker is NonNullable<typeof worker> => Boolean(worker)
    );
    console.log(`[${serviceName}] ${signal} received, draining ${workers.length} worker(s)`);

    if (workers.length === 0) {
      process.exit(0);
    }

    let remaining = workers.length;
    clusterRef.on("exit", () => {
      remaining -= 1;
      if (remaining <= 0) {
        console.log(`[${serviceName}] all workers exited, primary closing`);
        process.exit(0);
      }
    });

    // `cluster.disconnect()` alone only closes the IPC channel; it does not signal the child, so a
    // worker's own SIGTERM handler never runs and nothing drains. A supervisor signals the primary
    // only - the workers are not in its process group - so the primary has to relay it. Signalling
    // `worker.process` directly rather than `worker.kill()` skips cluster's disconnect-then-kill
    // dance, which is what left the primary still alive when the supervisor's patience ran out.
    for (const worker of workers) {
      try {
        worker.process.kill("SIGTERM");
      } catch {
        // Already gone; the exit handler above has it covered.
      }
    }

    const timer = setTimeout(() => {
      console.warn(`[${serviceName}] workers still running after ${FORCE_EXIT_MS}ms, forcing exit`);
      for (const worker of Object.values(clusterRef.workers ?? {})) worker?.kill("SIGKILL");
      process.exit(1);
    }, FORCE_EXIT_MS);

    timer.unref?.();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return () => shuttingDown;
}
