/**
 * OmniQ admin panel - serviceable zone config page.
 * Author: OmniQ Team
 */
import { AppShell } from "../components/layout/AppShell";
import { TopBar } from "../components/layout/TopBar";

export function ZoneConfig() {
  const pins = ["560001", "560002", "560034", "560040", "560076", "560100"];
  return (
    <AppShell>
      <TopBar title="Zone Config" eyebrow="🛡 ADMIN" action={<button className="button secondary">Save</button>} />
      <div className="map">
        <div className="zone">
          <div className="circle">📍</div>
        </div>
      </div>
      <div className="list">
        <div className="card row-card"><div className="circle">📍</div><div><h3>Delivery radius</h3><p className="muted">From store centre point</p></div><strong className="accent">15 km</strong></div>
        <div className="card row-card"><div className="circle">✅</div><div><h3>Zone gating active</h3><p className="muted">Buyers outside zone blocked at checkout</p></div><button className="button success">On</button></div>
        <div className="card row-card"><div className="circle">🌆</div><div><h3>Active city</h3><p className="muted">Primary delivery market</p></div><strong className="accent">Bengaluru</strong></div>
      </div>
      <div className="topbar" style={{ marginTop: 24, marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Serviceable PIN codes</h2>
        <button className="button secondary">+ Add new</button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {pins.map((pin) => (
          <span key={pin} className="tab active">{pin} ×</span>
        ))}
      </div>
    </AppShell>
  );
}
