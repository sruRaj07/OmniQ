/**
 * OmniQ mobile app - admin dashboard.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { useThemeColors, useAppTheme } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { LinearGradient } from "expo-linear-gradient";
import { MetricCard } from "@/components/admin/MetricCard";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { TopSellerCard } from "@/components/admin/TopSellerCard";

export default function AdminDashboardScreen() {
  const {
    colors,
    mode,
    setMode
  } = useAppTheme();
  const styles = getStyles(colors);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/dashboard");
      return res.data.data;
    }
  }, queryClient);

  // Fetch pending user requests (Data Export, Account Deletion)
  const { data: userRequestsResponse, isLoading: isLoadingRequests, error: requestsError } = useQuery({
    queryKey: ["adminUserRequests"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/user-requests?status=pending");
      return res.data;
    },
    refetchOnMount: "always",
    staleTime: 0
  });
  const pendingRequests = userRequestsResponse?.data || [];
  
  if (requestsError) {
    console.log("Error fetching requests:", requestsError);
  }

  // Action mutation
  const actionRequestMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string, status: string, adminNotes?: string }) => {
      const res = await apiClient.patch(`/admin/user-requests/${id}`, { status, adminNotes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserRequests"] });
      Alert.alert("Success", "Request actioned successfully");
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  });

  const handleActionRequest = (id: string, status: string, type: string) => {
    if (status === 'rejected') {
      actionRequestMutation.mutate({ id, status });
      return;
    }

    const message = `Are you sure you want to approve this ${type.replace("_", " ")} request?\n\n⚠️ WARNING: This will permanently delete the user account.`;

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        actionRequestMutation.mutate({ id, status });
      }
    } else {
      Alert.alert(
        `Confirm Approval`,
        message,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Confirm", 
            style: "destructive",
            onPress: () => actionRequestMutation.mutate({ id, status })
          }
        ]
      );
    }
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await supabase.auth.signOut();
    useAuthStore.getState().setSession(null);
    router.replace("/");
  };

  // Mock date
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return <Screen scroll>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.overviewTitle}>Overview</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>
        <View style={styles.topRightActions}>
          <TouchableOpacity onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')} style={styles.actionBtn}>
            <Text style={styles.actionText}>{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* WARNING BANNER */}
      {data?.pendingSellers > 0 && <View style={styles.warningBanner}>
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
        </View>}

      {/* PLATFORM METRICS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PLATFORM METRICS</Text>
        
        {/* TOTAL GMV CARD */}
        {/* TOTAL GMV CARD */}
        <View style={styles.gmvCard}>
          <View style={styles.gmvHeader}>
            <Text style={styles.gmvTitle}>TOTAL GMV</Text>
          </View>
          <Text style={styles.gmvValue}>
            ₹{(data?.gmv ?? 0).toLocaleString("en-IN")}
          </Text>
          
          <View style={styles.graphRow}>
            {/* Mock horizontal graph lines */}
            {[0.2, 0.4, 0.6, 0.8, 1, 0.9, 0.3].map((op, i) => (
              <View key={i} style={[styles.graphLine, i === 5 ? {
                backgroundColor: colors.accent
              } : {
                backgroundColor: colors.border,
                opacity: op
              }]} />
            ))}
          </View>
        </View>

        {/* METRICS GRID */}
        <View style={styles.metricsGrid}>
          <MetricCard title="ORDERS" value={(data?.orders ?? 0).toLocaleString("en-IN")} trend="" trendColor={colors.success} icon={<LocationIcon size={18} color={colors.textPrimary} />} glowColor={colors.textPrimary} />
          <MetricCard title="ACTIVE SELLERS" value={(data?.activeSellers ?? 0).toString()} trend={data?.pendingSellers ? `${data.pendingSellers} pending` : ""} trendColor={colors.textMuted} icon={<HomeIcon size={18} color={colors.textPrimary} />} glowColor={colors.textPrimary} />
          <MetricCard title="BUYERS" value={(data?.registeredBuyers ?? 0).toLocaleString("en-IN")} trend="" trendColor={colors.success} icon={<UsersIcon size={18} color={colors.textPrimary} />} glowColor={colors.textPrimary} />
          <MetricCard title="FLAGGED" value={(data?.flagged ?? 0).toString()} trend="" trendColor={colors.danger} icon={<FlagIcon size={18} color={colors.textPrimary} />} glowColor={colors.textPrimary} />
        </View>
      </View>

      {/* CUSTOMER REQUESTS SECTION */}
      <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>CUSTOMER REQUESTS</Text>
        
        {isLoadingRequests ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : pendingRequests.length === 0 ? (
          <View style={styles.emptyRequests}>
            <Text style={{ color: colors.textMuted }}>No pending requests.</Text>
          </View>
        ) : (
          pendingRequests.map((req: any) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View>
                  <Text style={styles.requestUser}>{req.profile?.full_name || req.profile?.email || 'Unknown User'}</Text>
                  <Text style={styles.requestEmail}>{req.profile?.email || 'No email'}</Text>
                </View>
                <View style={[styles.requestBadge, req.type === 'account_deletion' ? styles.badgeDanger : styles.badgeInfo]}>
                  <Text style={[styles.requestBadgeText, req.type === 'account_deletion' ? styles.badgeTextDanger : styles.badgeTextInfo]}>
                    {req.type === 'account_deletion' ? 'Delete Account' : 'Data Export'}
                  </Text>
                </View>
              </View>
              
              {req.reason ? (
                <Text style={styles.requestReason}>Reason: {req.reason}</Text>
              ) : null}
              
              <Text style={styles.requestDate}>
                Requested on: {new Date(req.created_at).toLocaleDateString()}
              </Text>
              
              <View style={styles.requestActions}>
                <TouchableOpacity 
                  style={[styles.requestBtn, styles.rejectBtn]} 
                  onPress={() => handleActionRequest(req.id, 'rejected', req.type)}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.requestBtn, styles.approveBtn]} 
                  onPress={() => handleActionRequest(req.id, 'approved', req.type)}
                >
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Bottom spacing for navbar */}
      <View style={{
      height: 60
    }} />
    </Screen>;
}
const getStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24
  },
  headerContent: {
    flex: 1
  },
  overviewTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12
  },
  warningIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.warning
  },
  warningIcon: {
    fontSize: 13
  },
  warningContent: {
    flex: 1
  },
  warningTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2
  },
  warningSub: {
    color: colors.textSecondary,
    fontSize: 11
  },
  warningLink: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 13
  },
  section: {
    marginBottom: 28
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 16
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16
  },
  sectionTitleNormal: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  linkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600"
  },
  gmvCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: 16
  },
  gmvHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  gmvTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5
  },
  gmvValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 20
  },
  graphRow: {
    flexDirection: "row",
    gap: 8,
    height: 4,
    alignItems: "center"
  },
  graphLine: {
    flex: 1,
    height: "100%",
    borderRadius: 2
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12
  },
  scrollRow: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingBottom: 4
  },
  marketingCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card
  },
  marketingContent: {
    flexDirection: "row",
    alignItems: "center"
  },
  marketingIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16
  },
  marketingTextContainer: {
    flex: 1
  },
  marketingTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4
  },
  marketingSub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  marketingArrow: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "300",
    marginLeft: 12
  },
  // Customer Requests Styles
  emptyRequests: {
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestUser: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  requestEmail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  requestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDanger: {
    backgroundColor: 'rgba(255, 77, 109, 0.1)',
  },
  badgeInfo: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  badgeTextDanger: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextInfo: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  requestReason: {
    color: colors.textPrimary,
    fontSize: 14,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  requestDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: colors.danger,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  }
});