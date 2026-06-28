/**
 * OmniQ mobile app - bottom navigation bar.
 * Author: OmniQ Team
 */
import { Link, usePathname, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type NavItem = {
  href: Href;
  icon: string;
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
        const active = pathname === item.href;
        return (
          <Link key={item.label} href={item.href} style={styles.link}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.label, active && styles.active]}>{item.label}</Text>
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
    textAlign: "center"
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
