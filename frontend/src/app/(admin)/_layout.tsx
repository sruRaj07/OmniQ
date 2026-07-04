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
import { FlagIcon } from "@/components/ui/FlagIcon";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";

export default function AdminLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 280,
          gestureEnabled: true,
          gestureDirection: "horizontal",
          contentStyle: { backgroundColor: "#0A0A0F" },
        }}
      />
      <BottomNavBar
        items={[
          { href: "/(admin)", icon: BarIcon, label: "" },
          { href: "/(admin)/sellers", icon: UsersIcon, label: "" },
          { href: "/(admin)/moderation", icon: FlagIcon, label: "" },
          { href: "/(admin)/zones", icon: GlobeIcon, label: "" },
          { href: "/(admin)/orders", icon: BoxIcon, label: "" }
        ]}
      />
    </View>
  );
}
