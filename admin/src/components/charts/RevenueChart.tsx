/**
 * OmniQ admin panel - simple revenue chart.
 * Author: OmniQ Team
 */
export function RevenueChart() {
  const values = [52, 80, 48, 92, 68, 110, 74];
  return (
    <div className="card">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <h2 style={{ margin: 0 }}>Revenue this week</h2>
        <button className="button">GMV</button>
      </div>
      <div className="chart">
        {values.map((height, index) => (
          <div key={index} className="bar" style={{ height }} />
        ))}
      </div>
    </div>
  );
}
