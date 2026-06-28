/**
 * OmniQ admin panel - application shell.
 * Author: OmniQ Team
 */
import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="page">{children}</main>
    </div>
  );
}
