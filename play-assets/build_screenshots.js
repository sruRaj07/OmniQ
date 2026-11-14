const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.resolve(__dirname);

const screens = [
  {
    id: 1,
    title: "OmniQ Marketplace",
    subtitle: "Shop Top Products & Daily Essentials",
    accentColor: "#3B82F6",
    gradient: "linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)",
    cardContent: `
      <div style="background:#fff;border-radius:24px;padding:28px;box-shadow:0 20px 40px rgba(0,0,0,0.15);width:100%;">
        <div style="display:flex;align-items:center;background:#F1F5F9;border-radius:16px;padding:16px 20px;gap:12px;margin-bottom:24px;">
          <span style="font-size:24px;">🔍</span>
          <span style="color:#64748B;font-size:20px;font-family:sans-serif;">Search 50,000+ items across top brands...</span>
        </div>
        <div style="display:flex;gap:14px;margin-bottom:28px;overflow:hidden;">
          <div style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:999px;font-weight:700;font-size:18px;">All</div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;color:#334155;padding:12px 24px;border-radius:999px;font-weight:600;font-size:18px;">Groceries</div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;color:#334155;padding:12px 24px;border-radius:999px;font-weight:600;font-size:18px;">Electronics</div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;color:#334155;padding:12px 24px;border-radius:999px;font-weight:600;font-size:18px;">Fashion</div>
        </div>
        <div style="background:linear-gradient(90deg, #F59E0B, #EF4444);border-radius:20px;padding:28px;color:#fff;margin-bottom:28px;">
          <div style="font-size:16px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Special Festival Offer</div>
          <div style="font-size:32px;font-weight:900;margin-top:6px;">UP TO 60% OFF</div>
          <div style="font-size:18px;margin-top:6px;opacity:0.9;">Direct from local hub with free shipping</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;padding:20px;">
            <div style="font-size:52px;text-align:center;margin-bottom:12px;">🎧</div>
            <div style="font-weight:700;font-size:18px;color:#1E293B;">Wireless Earbuds Pro</div>
            <div style="color:#16A34A;font-weight:800;font-size:22px;margin-top:8px;">₹1,499 <span style="font-size:15px;color:#94A3B8;text-decoration:line-through;">₹3,499</span></div>
            <div style="background:#DCFCE7;color:#15803D;display:inline-block;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:700;margin-top:8px;">In Stock • Express</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;padding:20px;">
            <div style="font-size:52px;text-align:center;margin-bottom:12px;">🌾</div>
            <div style="font-weight:700;font-size:18px;color:#1E293B;">Organic Basmati Rice 5kg</div>
            <div style="color:#16A34A;font-weight:800;font-size:22px;margin-top:8px;">₹499 <span style="font-size:15px;color:#94A3B8;text-decoration:line-through;">₹750</span></div>
            <div style="background:#DCFCE7;color:#15803D;display:inline-block;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:700;margin-top:8px;">Warehouse Hub</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 2,
    title: "Hyper-Local Delivery",
    subtitle: "Fastest Road Routes From Nearest Warehouse",
    accentColor: "#10B981",
    gradient: "linear-gradient(135deg, #065F46 0%, #0F172A 100%)",
    cardContent: `
      <div style="background:#fff;border-radius:24px;padding:28px;box-shadow:0 20px 40px rgba(0,0,0,0.15);width:100%;">
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:18px;padding:20px;display:flex;align-items:center;gap:16px;margin-bottom:24px;">
          <div style="font-size:40px;">🚚</div>
          <div>
            <div style="font-size:20px;font-weight:800;color:#065F46;">Karandighi Inventory Hub</div>
            <div style="font-size:16px;color:#047857;margin-top:4px;">Dispatched via optimal driving route • 3.2 km away</div>
          </div>
        </div>
        <div style="background:#F1F5F9;border-radius:20px;padding:30px;text-align:center;margin-bottom:24px;border:2px dashed #CBD5E1;">
          <div style="font-size:64px;margin-bottom:12px;">🗺️</div>
          <div style="font-size:22px;font-weight:800;color:#1E293B;">Road-Distance Routing Engine</div>
          <div style="font-size:16px;color:#64748B;margin-top:6px;max-width:400px;margin-left:auto;margin-right:auto;">
            Calculates actual driving paths instead of straight lines to ensure fast, reliable doorstep delivery.
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:20px;">
          <div>
            <div style="color:#64748B;font-size:15px;font-weight:600;">ESTIMATED TIME</div>
            <div style="color:#1E293B;font-size:24px;font-weight:900;margin-top:4px;">35-45 Mins</div>
          </div>
          <div>
            <div style="color:#64748B;font-size:15px;font-weight:600;">DELIVERY FEE</div>
            <div style="color:#16A34A;font-size:24px;font-weight:900;margin-top:4px;">FREE (Above ₹499)</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 3,
    title: "Smart Real-time Cart",
    subtitle: "Precise GPS Checkout & Zero Hidden Fees",
    accentColor: "#F59E0B",
    gradient: "linear-gradient(135deg, #78350F 0%, #0F172A 100%)",
    cardContent: `
      <div style="background:#fff;border-radius:24px;padding:28px;box-shadow:0 20px 40px rgba(0,0,0,0.15);width:100%;">
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:16px;padding:16px;display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <span style="font-size:24px;">📍</span>
          <div style="flex:1;">
            <div style="font-weight:800;font-size:16px;color:#1E40AF;">Precise Location Captured</div>
            <div style="font-size:14px;color:#3B82F6;">GPS Coords: 25.8425° N, 87.9405° E</div>
          </div>
          <span style="background:#22C55E;color:#fff;font-size:13px;font-weight:700;padding:4px 10px;border-radius:6px;">VERIFIED</span>
        </div>
        <div style="border:1px solid #E2E8F0;border-radius:18px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <span style="font-weight:700;font-size:18px;color:#1E293B;">Smart Fitness Watch v2</span>
            <span style="font-weight:800;font-size:18px;color:#1E293B;">₹1,899</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:700;font-size:18px;color:#1E293B;">Fast Charging Cable (2M)</span>
            <span style="font-weight:800;font-size:18px;color:#1E293B;">₹299</span>
          </div>
        </div>
        <div style="background:#F8FAFC;border-radius:18px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:16px;color:#64748B;">
            <span>Subtotal</span>
            <span>₹2,198</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:16px;color:#16A34A;font-weight:700;">
            <span>Delivery Fee</span>
            <span>FREE</span>
          </div>
          <div style="height:1px;background:#E2E8F0;margin:12px 0;"></div>
          <div style="display:flex;justify-content:space-between;font-size:22px;font-weight:900;color:#1E293B;">
            <span>Total Amount</span>
            <span style="color:#2563EB;">₹2,198</span>
          </div>
        </div>
        <div style="background:#F59E0B;color:#000;text-align:center;padding:18px;border-radius:16px;font-size:20px;font-weight:900;box-shadow:0 10px 20px rgba(245,158,11,0.3);">
          Confirm & Pay Cash on Delivery
        </div>
      </div>
    `
  },
  {
    id: 4,
    title: "Verified Local Sellers",
    subtitle: "Direct From Regional Stores & Distributors",
    accentColor: "#8B5CF6",
    gradient: "linear-gradient(135deg, #4C1D95 0%, #0F172A 100%)",
    cardContent: `
      <div style="background:#fff;border-radius:24px;padding:28px;box-shadow:0 20px 40px rgba(0,0,0,0.15);width:100%;">
        <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px;">
          <div style="width:70px;height:70px;background:linear-gradient(135deg, #8B5CF6, #EC4899);border-radius:20px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:32px;font-weight:900;">
            O
          </div>
          <div>
            <div style="font-size:24px;font-weight:900;color:#1E293B;">OmniQ Verified Seller Hub</div>
            <div style="font-size:16px;color:#16A34A;font-weight:700;margin-top:4px;">✓ Verified Merchant • Rating 4.9 ★ (1,240+ orders)</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px;">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:16px;border-radius:14px;text-align:center;">
            <div style="font-size:24px;font-weight:900;color:#2563EB;">100%</div>
            <div style="font-size:13px;color:#64748B;font-weight:600;margin-top:4px;">Genuine</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:16px;border-radius:14px;text-align:center;">
            <div style="font-size:24px;font-weight:900;color:#16A34A;">Fast</div>
            <div style="font-size:13px;color:#64748B;font-weight:600;margin-top:4px;">Dispatch</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:16px;border-radius:14px;text-align:center;">
            <div style="font-size:24px;font-weight:900;color:#F59E0B;">Easy</div>
            <div style="font-size:13px;color:#64748B;font-weight:600;margin-top:4px;">Returns</div>
          </div>
        </div>
        <div style="background:#F1F5F9;border-radius:18px;padding:22px;display:flex;align-items:center;gap:16px;">
          <span style="font-size:32px;">🛡️</span>
          <div style="font-size:15px;color:#475569;line-height:1.4;">
            Every seller on OmniQ is registered and mapped to regional warehouses for authentic products and buyer protection.
          </div>
        </div>
      </div>
    `
  }
];

screens.forEach(screen => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body {
          width: 1080px;
          height: 1920px;
          background: ${screen.gradient};
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 80px 60px;
          overflow: hidden;
          position: relative;
        }
        .header {
          text-align: center;
          margin-bottom: 60px;
          color: #FFFFFF;
        }
        .logo-tag {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          padding: 10px 24px;
          border-radius: 999px;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 24px;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .title {
          font-size: 54px;
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1.15;
          margin-bottom: 16px;
          text-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .subtitle {
          font-size: 26px;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
          max-width: 800px;
          margin: 0 auto;
        }
        .mockup-frame {
          width: 960px;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 36px;
          padding: 40px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.4);
        }
        .footer-tag {
          margin-top: 40px;
          font-size: 20px;
          color: rgba(255,255,255,0.6);
          font-weight: 600;
          letter-spacing: 1px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-tag">⚡ OmniQ E-Commerce</div>
        <div class="title">${screen.title}</div>
        <div class="subtitle">${screen.subtitle}</div>
      </div>
      <div class="mockup-frame">
        ${screen.cardContent}
      </div>
      <div class="footer-tag">OmniQ Multi-Vendor Marketplace • Fast & Reliable Delivery</div>
    </body>
    </html>
  `;

  const htmlPath = path.join(outDir, `temp_screen_${screen.id}.html`);
  fs.writeFileSync(htmlPath, html, 'utf8');

  const pngPath = path.join(outDir, `tablet-screenshot-${screen.id}.png`);
  console.log(`Generating screenshot ${screen.id}...`);
  execSync(`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --no-sandbox --user-data-dir=/tmp/chrome_headless_profile --window-size=1080,1920 --screenshot="${pngPath}" file://${htmlPath}`);
  fs.unlinkSync(htmlPath);
  console.log(`Saved: ${pngPath}`);
});

console.log('All tablet screenshots generated successfully!');
