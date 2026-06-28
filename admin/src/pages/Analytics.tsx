/**
 * OmniQ admin panel - analytics page.
 * Author: OmniQ Team
 */
import { CategoryDonut } from "../components/charts/CategoryDonut";
import { RevenueChart } from "../components/charts/RevenueChart";
import { AppShell } from "../components/layout/AppShell";
import { TopBar } from "../components/layout/TopBar";

export function Analytics() {
  return (
    <AppShell>
      <TopBar title="Analytics" eyebrow="🛡 ADMIN" />
      <section className="grid">
        <div className="card"><div className="metric-label">ORDERS BY AREA</div><div className="metric-value">Koramangala</div><p className="success">Top locality this week</p></div>
        <div className="card"><div className="metric-label">AVG ORDER VALUE</div><div className="metric-value">₹2,181</div><p className="success">↑ 9% vs last week</p></div>
        <div className="card"><div className="metric-label">COD SUCCESS</div><div className="metric-value">96%</div><p className="muted">Delivered without return</p></div>
        <div className="card"><div className="metric-label">FLAG RATE</div><div className="metric-value">0.8%</div><p className="success">Below threshold</p></div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, marginTop: 24 }}>
        <RevenueChart />
        <CategoryDonut />
      </div>
    </AppShell>
  );
}
