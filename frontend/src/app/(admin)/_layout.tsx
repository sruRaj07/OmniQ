/**
 * OmniQ mobile app - admin route group layout.
 * Smooth slide transitions for admin panel navigation.
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";
import { View, Platform } from "react-native";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { BarIcon } from "@/components/ui/BarIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { AdsIcon } from "@/components/ui/AdsIcon";
import { useAppTheme } from "@/store/useThemeStore";
import { useNavStore } from "@/store/useNavStore";

export default function AdminLayout() {
  const { colors } = useAppTheme();
  const slideDirection = useNavStore(state => state.slideDirection);
  return (
    <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary }}>
      <Stack
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
          gestureEnabled: Platform.OS !== 'web',
          gestureDirection: "horizontal",
          animation: Platform.OS === 'web' ? 'none' : slideDirection,
          animationTypeForReplace: "push",
          fullScreenGestureEnabled: Platform.OS === 'ios',
          contentStyle: { backgroundColor: Platform.OS === 'web' ? colors.bgSecondary : colors.bgPrimary },
        }}
      />
      <BottomNavBar
        items={[
          { href: "/(admin)", icon: BarIcon, label: "Overview" },
          { href: "/(admin)/sellers", icon: UsersIcon, label: "Sellers" },
          { href: "/(admin)/zones", icon: GlobeIcon, label: "Zones" },
          { href: "/(admin)/orders", icon: BoxIcon, label: "Orders" },
          { href: "/(admin)/manage-ads", icon: AdsIcon, label: "Marketing" }
        ]}
      />
    </View>
  );
}
