/**
 * OmniQ admin panel - login page.
 * Author: OmniQ Team
 */
import { Link } from "react-router-dom";

export function Login() {
  return (
    <div className="login">
      <div className="card login-card">
        <div style={{ textAlign: "center", fontSize: 48 }}>🛡</div>
        <h1 className="title" style={{ textAlign: "center" }}>Admin Portal</h1>
        <p className="muted" style={{ textAlign: "center" }}>Secure access for OmniQ administrators</p>
        <label className="metric-label">Admin Email</label>
        <input className="input" placeholder="admin@omniq.in" />
        <label className="metric-label">Password</label>
        <input className="input" placeholder="••••••••••••" type="password" />
        <Link to="/dashboard">
          <button className="button" style={{ width: "100%" }}>Sign In to Admin Panel</button>
        </Link>
        <p className="muted" style={{ textAlign: "center" }}>Protected by OmniQ Security · <span className="accent">2FA enabled</span></p>
      </div>
    </div>
  );
}
