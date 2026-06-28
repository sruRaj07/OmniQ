/**
 * OmniQ admin panel - product moderation page.
 * Author: OmniQ Team
 */
import { AppShell } from "../components/layout/AppShell";
import { TopBar } from "../components/layout/TopBar";

export function ProductModeration() {
  const products = ["Counterfeit shoes reported", "Incorrect jewellery purity claim", "Missing warranty information"];
  return (
    <AppShell>
      <TopBar title="Flagged Items" eyebrow="🛡 ADMIN" />
      <div className="list">
        {products.map((item, index) => (
          <div key={item} className="card row-card">
            <div className="circle">🚩</div>
            <div>
              <h2 style={{ margin: 0 }}>{item}</h2>
              <p className="muted">Flag #{index + 1} · submitted by buyer review flow</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="button success">Approve</button>
              <button className="button danger">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
