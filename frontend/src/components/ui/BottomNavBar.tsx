/**
 * OmniQ mobile app - bottom navigation bar.
 * Author: OmniQ Team
 */
import React from "react";
import { Link, usePathname, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type NavItem = {
  href: Href;
  icon: string | React.ComponentType<{ size?: number; color?: string }>;
  label: string;
};

type BottomNavBarProps = {
  items: NavItem[];
};

export function BottomNavBar({ items }: BottomNavBarProps) {
  const pathname = usePathname();
  return (
    <View style={styles.container}>
      {items.map((item) => {
        const normalizedHref = (item.href as string).replace(/\/\([^)]+\)/g, '');
        const targetPath = normalizedHref === '' ? '/' : normalizedHref;
        
        // Exact match or prefix match for sub-screens (e.g. /orders/123 matches /orders)
        const active = 
          pathname === targetPath || 
          pathname === item.href || 
          (targetPath !== '/' && pathname.startsWith(targetPath));
        return (
          <Link key={item.href as string} href={item.href} style={styles.link}>
            <View style={styles.iconContainer}>
              {typeof item.icon === "string" ? (
                <Text style={styles.icon}>{item.icon}</Text>
              ) : (
                <item.icon size={22} color={active ? colors.accentLight : colors.textMuted} />
              )}
            </View>
            {item.label ? <Text style={[styles.label, active && styles.active]}>{item.label}</Text> : null}
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.bgSecondary
  },
  link: {
    minWidth: 58,
    textAlign: "center",
    alignItems: "center"
  },
  iconContainer: {
    height: 26,
    justifyContent: "center",
    alignItems: "center"
  },
  icon: {
    textAlign: "center",
    fontSize: 22
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 3
  },
  active: {
    color: colors.accentLight
  }
});
