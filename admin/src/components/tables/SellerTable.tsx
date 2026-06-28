/**
 * OmniQ admin panel - seller table/list.
 * Author: OmniQ Team
 */
import { sellers } from "../../lib/demoData";

export function SellerTable() {
  return (
    <div className="list">
      {sellers.map((seller) => (
        <div key={seller.id} className="card row-card">
          <div className="circle">{seller.avatar}</div>
          <div>
            <h3 style={{ margin: 0 }}>{seller.name}</h3>
            <div className="muted">{seller.email}</div>
            <div>{seller.detail}</div>
          </div>
          <strong className={seller.status === "Active" ? "success" : seller.status === "Suspended" ? "accent" : "price"}>{seller.status}</strong>
        </div>
      ))}
    </div>
  );
}
