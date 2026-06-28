/**
 * OmniQ admin panel - overview dashboard.
 * Author: OmniQ Team
 */
import { AppShell } from "../components/layout/AppShell";
import { TopBar } from "../components/layout/TopBar";
import { RevenueChart } from "../components/charts/RevenueChart";

export function Dashboard() {
  return (
    <AppShell>
      <TopBar title="Overview" />
      <section className="grid">
        <Metric label="PLATFORM GMV" value="₹4.2L" trend="↑ 18% this week" />
        <Metric label="TOTAL ORDERS" value="1,284" trend="↑ 124 today" accent />
        <Metric label="ACTIVE SELLERS" value="48" trend="3 pending review" success />
        <Metric label="REGISTERED BUYERS" value="5,841" trend="↑ 312 this week" />
      </section>
      <div className="warning-card">
        <strong>⚠️ 3 sellers awaiting approval<br /><span className="muted">Submitted in last 24 hours</span></strong>
        <a className="accent" href="/sellers">Review →</a>
      </div>
      <section className="actions">
        {["✅ Approve Sellers", "🗺 Zone Config", "🚩 Flagged Items", "📊 Reports"].map((label) => (
          <div key={label} className="card action-tile">{label}</div>
        ))}
      </section>
      <RevenueChart />
      <section style={{ marginTop: 24 }}>
        <div className="topbar" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Top Sellers</h2>
          <a className="accent" href="/sellers">View all</a>
        </div>
        <div className="list">
          {["SportZone India|₹84,200|S", "TechHub Store|₹62,500|T", "Gehna Jewels|₹41,000|G"].map((raw, index) => {
            const [name, amount, initial] = raw.split("|");
            return (
              <div key={name} className="card row-card">
                <strong className="muted">#{index + 1}</strong>
                <div className="circle">{initial}</div>
                <div><strong>{name}</strong><div className="muted">{248 - index * 51} orders · ★ 4.{9 - index}</div></div>
                <div className="price">{amount}</div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

type MetricProps = {
  label: string;
  value: string;
  trend: string;
  accent?: boolean;
  success?: boolean;
};

function Metric({ label, value, trend, accent = false, success = false }: MetricProps) {
  return (
    <div className="card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: accent ? "#8b85ff" : success ? "#22c55e" : undefined }}>{value}</div>
      <div className={trend.startsWith("↑") ? "success" : "muted"}>{trend}</div>
    </div>
  );
}
