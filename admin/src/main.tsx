/**
 * OmniQ admin panel - application entry.
 * Author: OmniQ Team
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AllOrders } from "./pages/AllOrders";
import { Analytics } from "./pages/Analytics";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { ProductModeration } from "./pages/ProductModeration";
import { SellerManagement } from "./pages/SellerManagement";
import { ZoneConfig } from "./pages/ZoneConfig";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sellers" element={<SellerManagement />} />
        <Route path="/zones" element={<ZoneConfig />} />
        <Route path="/orders" element={<AllOrders />} />
        <Route path="/moderation" element={<ProductModeration />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
