/**
 * OmniQ mobile app - admin dashboard.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { BarIcon } from "@/components/ui/BarIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { MoreVerticalIcon } from "@/components/ui/MoreVerticalIcon";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";

export default function AdminDashboardScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/dashboard");
      return res.data.data;
    },
  });

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await supabase.auth.signOut();
    useAuthStore.getState().setSession(null);
    router.replace("/");
  };

  return (
    <>
      <Screen scroll>
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.greeting}>Admin Portal</Text>
              <ShieldIcon size={14} color={colors.textMuted} style={{ marginTop: 10 }} />
            </View>
            <Text style={styles.logo}>Omni<Text style={styles.logoAccent}>Q</Text></Text>
          </View>
          <View style={{ position: "relative", zIndex: 50 }}>
            <TouchableOpacity onPress={() => setIsMenuOpen(!isMenuOpen)} style={styles.logoutBtn}>
               <MoreVerticalIcon size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            
            {isMenuOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity onPress={handleLogout} style={styles.dropdownItem}>
                  <Text style={styles.dropdownText}>Logout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={{ color: colors.danger }}>Failed to load dashboard data.</Text>
        ) : (
          <View style={styles.grid}>
            <View style={[styles.card, { width: "100%" }]}>
              <Text style={styles.cardTitle}>Total GMV</Text>
              <Text style={styles.cardValue}>₹{data?.gmv?.toLocaleString("en-IN") || 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Orders</Text>
              <Text style={styles.cardValue}>{data?.orders || 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active Sellers</Text>
              <Text style={styles.cardValue}>{data?.activeSellers || 0}</Text>
            </View>
            <View style={[styles.card, { width: "100%" }]}>
              <Text style={styles.cardTitle}>Registered Buyers</Text>
              <Text style={styles.cardValue}>{data?.registeredBuyers || 0}</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Management</Text>
        </View>

        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => router.push("/(admin)/manage-ads")}
        >
          <View>
            <Text style={styles.actionCardTitle}>Manage Advertisements</Text>
            <Text style={styles.actionCardDesc}>Upload and manage home page promotional banners</Text>
          </View>
          <GlobeIcon size={24} color={colors.accent} />
        </TouchableOpacity>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  greeting: {
    color: colors.textMuted,
    fontWeight: "800",
    marginTop: 10
  },
  logo: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 20
  },
  logoAccent: {
    color: colors.accent
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    zIndex: 10
  },
  logoutBtn: {
    padding: 10,
    marginTop: 10
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 16
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: "900"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: "47%",
    borderWidth: 1,
    borderColor: colors.border
  },
  cardTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8
  },
  cardValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900"
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12
  },
  actionCardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4
  },
  actionCardDesc: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600"
  },
  dropdownMenu: {
    position: "absolute",
    top: 45,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  dropdownText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "700"
  }
});
