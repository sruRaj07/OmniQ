const nativewindPreset = require(require.resolve("nativewind/preset", { paths: [__dirname] }));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0A0A0F",
        "bg-secondary": "#12121A",
        "bg-tertiary": "#1A1A26",
        card: "#1E1E2E",
        "card-2": "#252538",
        border: "#2A2A3E",
        "border-2": "#353550",
        accent: "#6C63FF",
        "accent-light": "#8B85FF",
        gold: "#D4AF37",
        "gold-light": "#F0D060",
        "text-primary": "#F0F0FF",
        "text-secondary": "#A0A0C0",
        "text-muted": "#606080",
        success: "#22C55E",
        danger: "#FF4D6D",
        warning: "#F59E0B"
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "20px",
        xl: "40px",
        pill: "9999px"
      }
    }
  },
  plugins: []
};
