/**
 * OmniQ mobile app - State-of-the-Art category SVG icon system.
 * Delivers highly interpretable, crisp vector icons tailored to Indian ecommerce categories.
 * Author: OmniQ Team
 */
import * as React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, Rect, Line, Polyline } from "react-native-svg";

export interface CategorySvgIconProps {
  category: string;
  size?: number;
  showBackground?: boolean;
  style?: any;
}

interface IconConfig {
  color: string;
  bgTint: string;
  renderIcon: (size: number, color: string) => React.ReactElement;
}

export function getCategoryConfig(catName: string): IconConfig {
  const cat = catName.toLowerCase().trim();

  // 1. All / Explore / Dashboard
  if (cat === "all" || cat === "explore") {
    return {
      color: "#4F46E5", // Brand Indigo
      bgTint: "#EEF2FF",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="3" width="7" height="7" rx="1.5" />
          <Rect x="14" y="3" width="7" height="7" rx="1.5" />
          <Rect x="14" y="14" width="7" height="7" rx="1.5" />
          <Rect x="3" y="14" width="7" height="7" rx="1.5" />
        </Svg>
      ),
    };
  }

  // 2. Grocery / Supermarket / Food & Staples
  if (cat.includes("groc") || cat.includes("supermarket") || cat.includes("staple") || cat.includes("provision") || cat.includes("food")) {
    return {
      color: "#16A34A", // Fresh Green
      bgTint: "#DCFCE7",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 10h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10Z" />
          <Path d="M16 10V6a4 4 0 0 0-8 0v4" />
          <Path d="M9 14v2" />
          <Path d="M15 14v2" />
        </Svg>
      ),
    };
  }

  // 3. Kitchen & Dining / Cookware / Utensils
  if (cat.includes("kitchen") || cat.includes("cook") || cat.includes("utensil") || cat.includes("dining") || cat.includes("dish")) {
    return {
      color: "#EA580C", // Sunset Warm Orange
      bgTint: "#FFEDD5",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <Path d="M7 2v20" />
          <Path d="M21 15V2c-2 0-5 1.5-5 5v3c0 3.5 3 5 5 5Z" />
          <Path d="M21 15v7" />
        </Svg>
      ),
    };
  }

  // 4. Fruits & Vegetables / Organic Produce
  if (cat.includes("fruit") || cat.includes("veg") || cat.includes("produce") || cat.includes("organic")) {
    return {
      color: "#E11D48", // Ruby Apple Red
      bgTint: "#FFE4E6",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
          <Path d="M10 2c1 .5 2 2 2 5" />
        </Svg>
      ),
    };
  }

  // 5. Beverages / Drinks / Tea / Coffee / Juices
  if (cat.includes("beverage") || cat.includes("drink") || cat.includes("tea") || cat.includes("coffee") || cat.includes("juice") || cat.includes("soda") || cat.includes("milk") || cat.includes("water")) {
    return {
      color: "#0284C7", // Sky Drink Blue
      bgTint: "#E0F2FE",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 8h14l-1.5 13a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 8Z" />
          <Path d="M3 8h18" />
          <Path d="M14 2 10 8" />
          <Path d="M9 13v5" />
          <Path d="M15 13v5" />
        </Svg>
      ),
    };
  }

  // 6. Sweets / Snacks / Confectionery / Bakery / Chocolate
  if (cat.includes("sweet") || cat.includes("snack") || cat.includes("baker") || cat.includes("chocolat") || cat.includes("confection") || cat.includes("candy") || cat.includes("cake")) {
    return {
      color: "#9333EA", // Vibrant Purple / Sweet Berry
      bgTint: "#F3E8FF",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 11h12V8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v3Z" />
          <Path d="M4 11h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" />
          <Path d="M8 11v9" />
          <Path d="M16 11v9" />
          <Circle cx="12" cy="4" r="2" fill={color} />
        </Svg>
      ),
    };
  }

  // 7. Clothing / Clothes / Fashion / Apparel / Wear / Shirts
  if (cat.includes("cloth") || cat.includes("fashion") || cat.includes("apparel") || cat.includes("wear") || cat.includes("shirt") || cat.includes("dress") || cat.includes("sari") || cat.includes("saree") || cat.includes("kurta")) {
    return {
      color: "#DB2777", // Chic Fuchsia / Rose Pink
      bgTint: "#FCE7F3",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z" />
        </Svg>
      ),
    };
  }

  // 8. Electrical / Electronics / Tech / Mobiles / Gadgets / Computer
  if (cat.includes("elec") || cat.includes("tech") || cat.includes("mobile") || cat.includes("phone") || cat.includes("computer") || cat.includes("gadget") || cat.includes("appliance") || cat.includes("tv")) {
    return {
      color: "#2563EB", // Tech Sapphire Blue
      bgTint: "#DBEAFE",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
        </Svg>
      ),
    };
  }

  // 9. Footwear / Shoes / Sneakers / Sandals / Chappals
  if (cat.includes("footwear") || cat.includes("shoe") || cat.includes("sneakers") || cat.includes("boot") || cat.includes("sandal") || cat.includes("chappal")) {
    return {
      color: "#4338CA", // Indigo Blue
      bgTint: "#E0E7FF",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 16v-2.38C4 11.5 5.5 10 7.38 10c.8 0 1.57.3 2.15.84l1.3 1.2c.4.37.94.56 1.48.56h3.69c1.66 0 3 .89 3 2s-.89 2-2 2c-1.1 0-2.03-.4-3-1H4.6c-.33 0-.6-.27-.6-.6Z" />
          <Path d="M10 10V8a2 2 0 0 1 2-2h1" />
          <Path d="M4 18.5a.5.5 0 0 1 .5-.5h15a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5v-1Z" />
        </Svg>
      ),
    };
  }

  // 10. Personal Care / Beauty / Skincare / Hygiene / Cosmetics / Soaps
  if (cat.includes("beauty") || cat.includes("care") || cat.includes("cosmetic") || cat.includes("hygiene") || cat.includes("soap") || cat.includes("skin") || cat.includes("hair") || cat.includes("health")) {
    return {
      color: "#D97706", // Glamour Amber / Rose Gold
      bgTint: "#FEF3C7",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 2a4 4 0 0 1 4 4c0 .88-.29 1.7-.78 2.37L18 13v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7l2.78-4.63C8.29 7.7 8 6.88 8 6a4 4 0 0 1 4-4Z" />
          <Path d="M8 14h8" />
          <Path d="M12 6v2" />
        </Svg>
      ),
    };
  }

  // 11. Home & Decor / Furniture / Living / Household
  if (cat.includes("home") || cat.includes("furniture") || cat.includes("decor") || cat.includes("living") || cat.includes("household") || cat.includes("room")) {
    return {
      color: "#0D9488", // Teal Home
      bgTint: "#CCFBF1",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 10a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z" />
          <Path d="M5 8V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
          <Path d="M3 14h18" />
          <Path d="M6 18v2" />
          <Path d="M18 18v2" />
        </Svg>
      ),
    };
  }

  // 12. Books / Stationery / Office / School
  if (cat.includes("book") || cat.includes("stationery") || cat.includes("office") || cat.includes("school") || cat.includes("paper") || cat.includes("study") || cat.includes("pen")) {
    return {
      color: "#7C3AED", // Violet Intellect
      bgTint: "#EDE9FE",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3Z" />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3Z" />
        </Svg>
      ),
    };
  }

  // 13. Pet Supplies / Animals / Dogs / Cats
  if (cat.includes("pet") || cat.includes("animal") || cat.includes("dog") || cat.includes("cat") || cat.includes("bird") || cat.includes("fish")) {
    return {
      color: "#F97316", // Bright Orange
      bgTint: "#FFEDD5",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="5" r="2.5" />
          <Circle cx="5.5" cy="8" r="2" />
          <Circle cx="18.5" cy="8" r="2" />
          <Path d="M12 21c-4.4 0-6.5-2.5-6.5-5 0-2.5 2-4 3.5-4 1 0 2 .5 3 .5s2-.5 3-.5c1.5 0 3.5 1.5 3.5 4 0 2.5-2.1 5-6.5 5Z" />
        </Svg>
      ),
    };
  }

  // 14. Toys & Kids / Baby / Games
  if (cat.includes("toy") || cat.includes("kid") || cat.includes("baby") || cat.includes("game") || cat.includes("child")) {
    return {
      color: "#EC4899", // Playful Pink
      bgTint: "#FCE7F3",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <Line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
          <Line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
        </Svg>
      ),
    };
  }

  // 15. Sports, Fitness & Gym
  if (cat.includes("sport") || cat.includes("gym") || cat.includes("fitness") || cat.includes("exercise") || cat.includes("cricket") || cat.includes("football")) {
    return {
      color: "#059669", // Energetic Emerald
      bgTint: "#D1FAE5",
      renderIcon: (size, color) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Path d="M4.93 4.93 19.07 19.07" />
          <Path d="M14 10 10 14" />
          <Path d="M18.4 6.6 6.6 18.4" />
        </Svg>
      ),
    };
  }

  // 16. Default / Test / General / Others
  return {
    color: "#64748B", // Slate Grey
    bgTint: "#F1F5F9",
    renderIcon: (size, color) => (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <Circle cx="7" cy="7" r="1.5" fill={color} />
      </Svg>
    ),
  };
}

export function CategorySvgIcon({ category, size = 22, showBackground = true, style }: CategorySvgIconProps) {
  const config = getCategoryConfig(category);

  if (!showBackground) {
    return (
      <View style={style}>
        {config.renderIcon(size, config.color)}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconContainer,
        {
          backgroundColor: config.bgTint,
          width: size + 14,
          height: size + 14,
        },
        style,
      ]}
    >
      {config.renderIcon(size, config.color)}
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
});
