/**
 * OmniQ admin panel - seller management page.
 * Author: OmniQ Team
 */
import { AppShell } from "../components/layout/AppShell";
import { TopBar } from "../components/layout/TopBar";
import { SellerTable } from "../components/tables/SellerTable";
import { sellers } from "../lib/demoData";

export function SellerManagement() {
  return (
    <AppShell>
      <TopBar title="Sellers" eyebrow="🛡 ADMIN" action={<button className="button secondary">+ Invite</button>} />
      <div className="tabs">
        <span className="tab active">All (51)</span>
        <span className="tab">Pending (3)</span>
        <span className="tab">Active (45)</span>
        <span className="tab">Suspended (2)</span>
      </div>
      <div className="list">
        {sellers.map((seller) => (
          <div key={seller.id} className="card">
            <div className="row-card">
              <div className="circle">{seller.avatar}</div>
              <div>
                <h2 style={{ margin: 0 }}>{seller.name}</h2>
                <div className="muted">{seller.email}</div>
                <strong>{seller.detail}</strong>
              </div>
              <strong className={seller.status === "Active" ? "success" : seller.status === "Suspended" ? "accent" : "price"}>{seller.status}</strong>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              {seller.status === "Pending" ? <button className="button success">✓ Approve</button> : null}
              <button className="button secondary">👁 View Docs</button>
              <button className="button danger">{seller.status === "Pending" ? "✗ Reject" : "🗑 Remove"}</button>
            </div>
          </div>
        ))}
      </div>
      <section style={{ marginTop: 28 }}>
        <h2>Compact Table</h2>
        <SellerTable />
      </section>
    </AppShell>
  );
}
