/**
 * OmniQ mobile app - bottom navigation bar.
 * Author: OmniQ Team
 */
import React from "react";
import { Link, usePathname, type Href } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { colors } from "@/constants/colors";

export type NavItem = {
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
          <Link key={item.href as string} href={item.href} asChild>
            <Pressable style={styles.navItem}>
              <View style={styles.iconContainer}>
                {typeof item.icon === "string" ? (
                  <Text style={styles.icon}>{item.icon}</Text>
                ) : (
                  <item.icon size={26} color={active ? colors.textPrimary : colors.textMuted} />
                )}
              </View>
              {item.label ? <Text style={[styles.label, active && styles.active]}>{item.label}</Text> : null}
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.bgSecondary
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: 28
  },
  icon: {
    textAlign: "center",
    fontSize: 24
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "800"
  },
  active: {
    color: colors.textPrimary
  }
});
