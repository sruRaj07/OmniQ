/**
 * OmniQ mobile app - bottom navigation bar.
 * Author: OmniQ Team
 */
import React from "react";
import { usePathname, useSegments, useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useAppTheme } from "@/store/useThemeStore";
import { useNavStore } from "@/store/useNavStore";
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
  const router = useRouter();
  const setSlideDirection = useNavStore(state => state.setSlideDirection);

  // Find the currently active index
  let activeIndex = 0;
  items.forEach((item, index) => {
    const itemHref = item.href as string;
    const normalizedHref = itemHref.replace(/\/\([^)]+\)/g, '');
    const targetPath = normalizedHref === '' ? '/' : normalizedHref;
    const currentRoute = '/' + segments.join('/');
    const isRootGroup = itemHref.match(/^\/\([^)]+\)$/) || itemHref === '/';
    
    if (currentRoute === itemHref || pathname === targetPath || currentRoute === itemHref + '/index') {
      activeIndex = index;
    } else if (!isRootGroup) {
      if (currentRoute.startsWith(itemHref + '/') || (targetPath !== '/' && pathname.startsWith(targetPath + '/'))) {
        activeIndex = index;
      }
    }
  });

  const handlePress = (item: NavItem, index: number, isActive: boolean) => {
    if (isActive) return;

    if (index > activeIndex) {
      setSlideDirection("slide_from_right");
    } else {
      setSlideDirection("slide_from_left");
    }

    // Small delay ensures the store updates before the router transition begins
    setTimeout(() => {
      router.replace(item.href);
    }, 10);
  };

  return <View style={styles.container}>
      {items.map((item, index) => {
      const isActive = index === activeIndex;

      return (
        <Pressable 
          key={item.href as string} 
          style={styles.navItem} 
          onPress={() => handlePress(item, index, isActive)}
        >
          <View style={styles.iconContainer}>
            {typeof item.icon === "string" ? <Text style={styles.icon}>{item.icon}</Text> : <item.icon size={26} color={isActive ? colors.accent : colors.textMuted} />}
          </View>
          {item.label ? <Text style={[styles.label, isActive && styles.active]}>{item.label}</Text> : null}
        </Pressable>
      );
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