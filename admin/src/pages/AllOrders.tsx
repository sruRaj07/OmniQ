/**
 * OmniQ admin panel - all orders page.
 * Author: OmniQ Team
 */
import { AppShell } from "../components/layout/AppShell";
import { TopBar } from "../components/layout/TopBar";
import { OrderTable } from "../components/tables/OrderTable";

export function AllOrders() {
  return (
    <AppShell>
      <TopBar title="All Orders" eyebrow="🛡 ADMIN" action={<button className="button secondary">⬇ Export</button>} />
      <div className="tabs">
        <span className="tab active">All (1,284)</span>
        <span className="tab">Pending (47)</span>
        <span className="tab">Packed (83)</span>
        <span className="tab">Shipped (412)</span>
      </div>
      <OrderTable />
    </AppShell>
  );
}
