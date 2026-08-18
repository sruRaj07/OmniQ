/**
 * OmniQ mobile app - seller portal bottom navigation.
 *
 * ⚡ PERFORMANCE: a module-level constant, not an inline array. Every seller screen used to
 * build this list again on each render, handing `BottomNavBar` a fresh prop identity and
 * re-rendering the whole bar (and its four SVG icons) on every state change.
 *
 * Author: OmniQ Team
 */
import type { NavItem } from "@/components/ui/BottomNavBar";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ListIcon } from "@/components/ui/ListIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";

export const SELLER_NAV_ITEMS: NavItem[] = [
  { href: "/(seller)/dashboard" as any, icon: HomeIcon, label: "Home" },
  { href: "/(seller)/products" as any, icon: ListIcon, label: "Products" },
  { href: "/(seller)/seller-orders" as any, icon: BoxIcon, label: "Orders" },
  { href: "/(seller)/seller-profile" as any, icon: UserIcon, label: "Profile" },
];
