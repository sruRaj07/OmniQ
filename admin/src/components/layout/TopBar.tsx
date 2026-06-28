import type { ReactNode } from "react";

/**
 * OmniQ admin panel - page heading bar.
 * Author: OmniQ Team
 */
type TopBarProps = {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
};

export function TopBar({ eyebrow = "🛡 SUPER ADMIN", title, action }: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="title">{title}</h1>
      </div>
      {action ?? <div className="avatar">R</div>}
    </header>
  );
}
