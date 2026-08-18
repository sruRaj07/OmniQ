/**
 * OmniQ mobile app - seller application pending review.
 *
 * A dead-end screen with an hourglass emoji told the seller nothing about where they were in
 * the process. It now shows the three stages, marks where they are, and lets them re-check
 * the decision without closing and reopening the app.
 *
 * Author: OmniQ Team
 */
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/shared/Screen";
import { Surface } from "@/components/seller/SellerUI";
import { useThemeColors } from "@/store/useThemeStore";
import { sellerProfileOf, useSellerStatus } from "@/hooks/useSellerStatus";
import { RADIUS, SPACE, withAlpha } from "@/constants/sellerTheme";
import { CheckIcon, ClockIcon, ShieldCheckIcon, StoreIcon } from "@/components/ui/SellerIcons";

type StageState = "done" | "current" | "todo";

const STAGES = [
  { key: "submitted", title: "Application submitted", caption: "We have your business details." },
  { key: "review", title: "Under review", caption: "An admin is verifying your GST and category." },
  { key: "approved", title: "Store goes live", caption: "You can start listing products right away." },
] as const;

export default function PendingApprovalScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();
  const { sellerProfile, refetch } = useSellerStatus();
  const [checking, setChecking] = useState(false);

  const status = String(sellerProfile?.status ?? "pending").toLowerCase();
  const isRejected = status === "rejected" || status === "suspended";

  const handleCheck = useCallback(async () => {
    setChecking(true);
    try {
      const result = await refetch();
      const refreshed = sellerProfileOf(result.data);
      const nextStatus = String(refreshed?.status ?? "").toLowerCase();
      if (nextStatus === "approved" || nextStatus === "active") {
        router.replace("/(seller)/dashboard" as any);
      }
    } finally {
      setChecking(false);
    }
  }, [refetch, router]);

  // Rejection stops the timeline at review; otherwise the seller sits on stage two.
  const stateOf = (index: number): StageState => {
    if (index === 0) return "done";
    if (index === 1) return isRejected ? "done" : "current";
    return "todo";
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.badge, isRejected && { backgroundColor: withAlpha(colors.danger, 0.12) }]}>
          {isRejected ? (
            <ShieldCheckIcon size={22} color={colors.danger} strokeWidth={2} />
          ) : (
            <ClockIcon size={22} color={colors.warning} strokeWidth={2} />
          )}
        </View>
        <Text style={styles.title}>{isRejected ? "Application not approved" : "Under review"}</Text>
        <Text style={styles.subtitle}>
          {isRejected
            ? "Our team could not approve this application. Reach out to support with your GST details and we will take another look."
            : "Your seller application is with our admin team. Reviews usually finish within 24–48 hours, and you can keep shopping as a buyer in the meantime."}
        </Text>
      </View>

      <Surface style={styles.timeline}>
        {STAGES.map((stage, index) => {
          const state = stateOf(index);
          const isLast = index === STAGES.length - 1;
          return (
            <View key={stage.key} style={styles.stageRow}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    state === "done" && styles.dotDone,
                    state === "current" && styles.dotCurrent,
                  ]}
                >
                  {state === "done" ? <CheckIcon size={11} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
                {!isLast ? <View style={[styles.connector, state === "done" && styles.connectorDone]} /> : null}
              </View>
              <View style={styles.stageBody}>
                <Text style={[styles.stageTitle, state === "todo" && styles.stageMuted]}>{stage.title}</Text>
                <Text style={styles.stageCaption}>{stage.caption}</Text>
              </View>
            </View>
          );
        })}
      </Surface>

      <View style={styles.actions}>
        {!isRejected ? (
          <Button onPress={handleCheck} loading={checking} disabled={checking}>
            Check application status
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onPress={() => router.push("/(buyer)/profile" as any)}
          icon={<StoreIcon size={17} color={colors.accent} strokeWidth={2.2} />}
        >
          Back to buyer app
        </Button>
      </View>
    </Screen>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    header: { marginTop: SPACE.xl, marginBottom: SPACE.xxl },
    badge: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.lg,
      backgroundColor: withAlpha(colors.warning, 0.12),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACE.lg,
    },
    title: { color: colors.textPrimary, fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
    subtitle: { color: colors.textSecondary, fontSize: 14.5, lineHeight: 22, marginTop: SPACE.sm },
    timeline: { padding: SPACE.xl, gap: 0 },
    stageRow: { flexDirection: "row", gap: SPACE.lg },
    rail: { alignItems: "center", width: 22 },
    dot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border2,
      backgroundColor: colors.bgSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    dotDone: { backgroundColor: colors.success, borderColor: colors.success },
    dotCurrent: { borderColor: colors.warning, backgroundColor: withAlpha(colors.warning, 0.18) },
    connector: { flex: 1, width: 2, minHeight: 26, backgroundColor: colors.border, marginVertical: 3 },
    connectorDone: { backgroundColor: colors.success },
    stageBody: { flex: 1, paddingBottom: SPACE.xl },
    stageTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "800", marginTop: 1 },
    stageMuted: { color: colors.textMuted },
    stageCaption: { color: colors.textMuted, fontSize: 12.5, fontWeight: "500", marginTop: 3, lineHeight: 18 },
    actions: { marginTop: SPACE.xxl, gap: SPACE.md },
  });
