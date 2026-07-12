/**
 * OmniQ mobile app - bottom navigation bar.
 * Author: OmniQ Team
 */
import React from "react";
import { Link, usePathname, useSegments, type Href } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useAppTheme } from "@/store/useThemeStore";
import { typography } from "@/constants/typography";
export type NavItem = {
  href: Href;
  icon: string | React.ComponentType<{
    size?: number;
    color?: string;
  }>;
  label: string;
};
type BottomNavBarProps = {
  items: NavItem[];
};
export function BottomNavBar({
  items
}: BottomNavBarProps) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const pathname = usePathname();
  const segments = useSegments();
  return <View style={styles.container}>
      {items.map(item => {
      const itemHref = item.href as string;
      const normalizedHref = itemHref.replace(/\/\([^)]+\)/g, '');
      const targetPath = normalizedHref === '' ? '/' : normalizedHref;

      // Construct the full current route from segments (e.g. "/(seller)/dashboard")
      const currentRoute = '/' + segments.join('/');

      // Exact match or prefix match for sub-screens
      let active = false;
      const isRootGroup = itemHref.match(/^\/\([^)]+\)$/) || itemHref === '/';
      
      if (currentRoute === itemHref || pathname === targetPath || currentRoute === itemHref + '/index') {
        active = true;
      } else if (!isRootGroup) {
        if (currentRoute.startsWith(itemHref + '/') || (targetPath !== '/' && pathname.startsWith(targetPath + '/'))) {
          active = true;
        }
      }
      return <Link key={item.href as string} href={item.href} asChild>
            <Pressable style={styles.navItem}>
              <View style={styles.iconContainer}>
                {typeof item.icon === "string" ? <Text style={styles.icon}>{item.icon}</Text> : <item.icon size={26} color={active ? colors.accent : colors.textMuted} />}
              </View>
              {item.label ? <Text style={[styles.label, active && styles.active]}>{item.label}</Text> : null}
            </Pressable>
          </Link>;
    })}
    </View>;
}
const getStyles = (colors: any) => StyleSheet.create({
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
    fontSize: 22
  },
  label: {
    color: colors.textMuted,
    ...typography.small,
    textAlign: "center",
    fontWeight: "700"
  },
  active: {
    color: colors.accent
  }
});