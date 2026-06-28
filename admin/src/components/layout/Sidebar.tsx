/**
 * OmniQ admin panel - sidebar navigation.
 * Author: OmniQ Team
 */
import { NavLink } from "react-router-dom";

export function Sidebar() {
  const links = [
    ["/dashboard", "🏠", "Home"],
    ["/sellers", "🏪", "Sellers"],
    ["/orders", "📦", "Orders"],
    ["/zones", "🗺", "Zones"],
    ["/moderation", "🚩", "Moderation"],
    ["/analytics", "📊", "Analytics"]
  ] as const;
  return (
    <aside className="sidebar">
      <div className="brand">Omni<span>Q</span></div>
      {links.map(([to, icon, label]) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          <span>{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
