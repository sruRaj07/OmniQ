/**
 * OmniQ mobile app - admin route group layout.
 * Smooth slide transitions for admin panel navigation.
 * Author: OmniQ Team
 */
import { Stack } from "expo-router";
import { View } from "react-native";
import { BottomNavBar } from "@/components/ui/BottomNavBar";
import { BarIcon } from "@/components/ui/BarIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { AdsIcon } from "@/components/ui/AdsIcon";

export default function AdminLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <Stack
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
          gestureEnabled: true,
          gestureDirection: "horizontal",
          contentStyle: { backgroundColor: "#0A0A0F" },
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
