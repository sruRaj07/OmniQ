/**
 * OmniQ admin panel - order table/list.
 * Author: OmniQ Team
 */
import { adminOrders } from "../../lib/demoData";

export function OrderTable() {
  return (
    <div className="list">
      {adminOrders.map((order) => (
        <div key={order.id} className="card row-card">
          <div className="circle">📦</div>
          <div>
            <h3 style={{ margin: 0 }}>{order.id}</h3>
            <strong>{order.productTitle}</strong>
            <div className="muted">Buyer: {order.buyer} · Seller: {order.seller}</div>
            <div className="muted">📍 {order.location}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted">{order.createdAt}</div>
            <div className="price">₹{order.amount.toLocaleString("en-IN")}</div>
            <button className="button danger">🚩 Flag</button>
          </div>
        </div>
      ))}
    </div>
  );
}
