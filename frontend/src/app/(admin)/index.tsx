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
import { LocationIcon } from "@/components/ui/LocationIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { GridIcon } from "@/components/ui/GridIcon";
import { SearchIcon } from "@/components/ui/SearchIcon";
import { Screen } from "@/components/shared/Screen";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";
import { LinearGradient } from "expo-linear-gradient";
import { MetricCard } from "@/components/admin/MetricCard";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { TopSellerCard } from "@/components/admin/TopSellerCard";

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

  // Mock date
  const today = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });

  return (
    <Screen scroll>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.superAdminRow}>
            <View style={styles.dot} />
            <Text style={styles.superAdminText}>SUPER ADMIN</Text>
          </View>
          <Text style={styles.overviewTitle}>Overview</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>R</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* WARNING BANNER */}
      {data?.pendingSellers > 0 && (
        <View style={styles.warningBanner}>
          <View style={styles.warningIconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>{data.pendingSellers} seller{data.pendingSellers > 1 ? 's' : ''} awaiting approval</Text>
            <Text style={styles.warningSub}>Pending review</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.warningLink}>Review ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PLATFORM METRICS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PLATFORM METRICS</Text>
        
        {/* TOTAL GMV CARD */}
        <LinearGradient
          colors={["#161622", "#0F0F1A"]}
          style={styles.gmvCard}
        >
          <View style={styles.gmvHeader}>
            <Text style={styles.gmvTitle}>TOTAL GMV</Text>
            <View style={styles.trendPill}>
              <Text style={styles.trendPillText}>^ +18% this week</Text>
            </View>
          </View>
          <Text style={styles.gmvValue}>
            ₹{(data?.gmv ?? 0).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.gmvSub}>Gross merchandise value — all time</Text>
          
          <View style={styles.graphRow}>
            {/* Mock horizontal graph lines */}
            {[0.2, 0.4, 0.6, 0.8, 1, 0.9, 0.3].map((op, i) => (
              <View 
                key={i} 
                style={[
                  styles.graphLine, 
                  i === 5 ? { backgroundColor: "#FFC107" } : { backgroundColor: "#6C63FF", opacity: op }
                ]} 
              />
            ))}
          </View>
        </LinearGradient>

        {/* METRICS GRID */}
        <View style={styles.metricsGrid}>
          <MetricCard 
            title="ORDERS" 
            value={(data?.orders ?? 0).toLocaleString("en-IN")}
            trend="" 
            trendColor="#4CAF50"
            icon={<LocationIcon size={18} color="#6C63FF" />}
            glowColor="#6C63FF"
          />
          <MetricCard 
            title="ACTIVE SELLERS" 
            value={(data?.activeSellers ?? 0).toString()}
            trend={data?.pendingSellers ? `${data.pendingSellers} pending` : ""} 
            trendColor={colors.textMuted}
            icon={<HomeIcon size={18} color="#4CAF50" />}
            glowColor="#4CAF50"
          />
          <MetricCard 
            title="BUYERS" 
            value={(data?.registeredBuyers ?? 0).toLocaleString("en-IN")}
            trend="" 
            trendColor="#4CAF50"
            icon={<UsersIcon size={18} color="#FFC107" />}
            glowColor="#FFC107"
          />
          <MetricCard 
            title="FLAGGED" 
            value={(data?.flagged ?? 0).toString()}
            trend="" 
            trendColor="#F93C65"
            icon={<FlagIcon size={18} color="#F93C65" />}
            glowColor="#F93C65"
          />
        </View>
      </View>

      {/* TOP SELLERS */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleNormal}>Top sellers</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        <View>
          {data?.topSellers?.map((seller: any, index: number) => (
            <TopSellerCard 
              key={seller.id}
              rank={index + 1}
              name={seller.name}
              orders={seller.orders}
              rating={seller.rating}
              gmv={seller.gmv}
              status={seller.status}
              timeAgo={seller.timeAgo}
            />
          ))}
        </View>
      </View>

      {/* MARKETING & CAMPAIGNS ENTRY */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MARKETING</Text>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push("/manage-ads")}
        >
          <LinearGradient
            colors={["rgba(249, 60, 101, 0.15)", "rgba(108, 99, 255, 0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.marketingCard}
          >
            <View style={styles.marketingContent}>
              <View style={styles.marketingIconBg}>
                <FlagIcon size={24} color="#F93C65" />
              </View>
              <View style={styles.marketingTextContainer}>
                <Text style={styles.marketingTitle}>Campaign Management</Text>
                <Text style={styles.marketingSub}>Upload posters (JPG/PNG) & manage live platform ads</Text>
              </View>
              <Text style={styles.marketingArrow}>→</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Bottom spacing for navbar */}
      <View style={{ height: 60 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  superAdminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6C63FF",
  },
  superAdminText: {
    color: "#6C63FF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  overviewTitle: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF7043",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 112, 67, 0.3)",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 193, 7, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  warningIcon: {
    fontSize: 14,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    color: "#FFC107",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  warningSub: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
  },
  warningLink: {
    color: "#6C63FF",
    fontWeight: "800",
    fontSize: 13,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  sectionTitleNormal: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  linkText: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "800",
  },
  gmvCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 16,
  },
  gmvHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  gmvTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  trendPill: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendPillText: {
    color: "#4CAF50",
    fontSize: 11,
    fontWeight: "800",
  },
  gmvValue: {
    color: colors.goldLight,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: 6,
  },
  gmvSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 20,
  },
  graphRow: {
    flexDirection: "row",
    gap: 8,
    height: 4,
    alignItems: "center",
  },
  graphLine: {
    flex: 1,
    height: "100%",
    borderRadius: 2,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  scrollRow: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  marketingCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(249, 60, 101, 0.2)",
  },
  marketingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  marketingIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(249, 60, 101, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  marketingTextContainer: {
    flex: 1,
  },
  marketingTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  marketingSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 18,
  },
  marketingArrow: {
    color: "#F93C65",
    fontSize: 24,
    fontWeight: "300",
    marginLeft: 12,
  },
});
