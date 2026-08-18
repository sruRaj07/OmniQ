/**
 * OmniQ admin console - Marketing Hub. Campaign and promotional offer management.
 * Author: OmniQ Team
 */
// Explicit React import: this tsconfig uses the classic JSX transform, so a file rendering JSX
// without it resolves `React` to a UMD global and TypeScript reports TS2686 on every element.
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/shared/Screen";
import { Input } from "@/components/ui/Input";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { queryClient } from "@/lib/queryClient";
import { sizedImageUrl } from "@/utils/imageUrl";
import { confirmAction, errorMessage, notify } from "@/utils/dialog";
import { RADIUS, SPACE, withAlpha } from "@/constants/adminTheme";
import { AdsIcon } from "@/components/ui/AdsIcon";
import { ArrowLeftIcon } from "@/components/ui/ArrowLeftIcon";
import { EditIcon } from "@/components/ui/EditIcon";
import { PauseIcon } from "@/components/ui/PauseIcon";
import { PlayIcon } from "@/components/ui/PlayIcon";
import { TrashIcon } from "@/components/ui/TrashIcon";
import { ImageIcon, PlusIcon, XIcon } from "@/components/ui/SellerIcons";
import {
  AdminHeader,
  EmptyState,
  FreshnessLabel,
  QueryBoundary,
  SegmentedTabs,
  SkeletonRows,
  StatusPill,
  Surface,
  type SegmentItem
} from "@/components/admin/AdminUI";

type Advertisement = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  is_active: boolean;
};

type TabKey = "ads" | "offers";

/**
 * Offers and advertisements share one table and are told apart by a title prefix. That is the
 * storage contract as it stands, so it is stated once here rather than spelled out at each of the
 * six places that used to do its own `startsWith` / `replace`.
 */
const OFFER_PREFIX = "[OFFER] ";
const isOffer = (campaign: Advertisement) => campaign.title.startsWith(OFFER_PREFIX);
const displayTitle = (title: string) => (title.startsWith(OFFER_PREFIX) ? title.slice(OFFER_PREFIX.length) : title);
const storedTitle = (title: string, tab: TabKey) => (tab === "offers" ? `${OFFER_PREFIX}${title.trim()}` : title.trim());

const COPY = {
  ads: { one: "advertisement", many: "Advertisements", create: "New advertisement", section: "Campaigns" },
  offers: { one: "offer", many: "Offers", create: "New offer", section: "Offers" }
} as const;

/**
 * Rendition sizes. Both bounds are stated because Supabase's `resize=contain` needs a height to
 * preserve the aspect ratio - see the note in utils/imageUrl. Thumbnails are 16:9 at ~112dp wide,
 * doubled for screen density; the edit preview spans roughly a full column.
 */
const THUMB_RENDITION = { width: 224, height: 126, quality: 65 } as const;
const PREVIEW_RENDITION = { width: 720, height: 405, quality: 70 } as const;

/** Shared picker config so the create and edit paths cannot drift apart. */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [16, 9],
  quality: 0.8
};

async function pickBanner(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

/**
 * Turns a local image URI into something FormData will accept on either platform. Web needs a real
 * Blob; native takes the `{uri, name, type}` shape React Native's fetch understands.
 */
async function appendImage(formData: FormData, uri: string): Promise<void> {
  const filename = uri.split("/").pop() || "campaign.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1]}` : "image/jpeg";

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    formData.append("image", await response.blob(), filename);
    return;
  }
  formData.append("image", { uri, name: filename, type: mimeType } as any);
}

export default function ManageAdsScreen() {
  const colors = useThemeColors();
  // ⚡ PERFORMANCE: StyleSheet.create built roughly sixty style objects on *every* render, and this
  // screen re-renders on each keystroke in the campaign title. `colors` is a single frozen object
  // reference for the life of the app, so this now runs exactly once.
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("ads");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reads the admin list, not the storefront one: `/products/advertisements` filters to
  // is_active = true, so a paused campaign disappeared from the only screen that could resume it.
  const campaignsQuery = useQuery({
    queryKey: ["admin-advertisements"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Advertisement[] }>("/admin/advertisements");
      return response.data?.data ?? [];
    },
    staleTime: 30_000
  });

  const { ads, offers } = useMemo(() => {
    const buckets: { ads: Advertisement[]; offers: Advertisement[] } = { ads: [], offers: [] };
    for (const campaign of campaignsQuery.data ?? []) {
      (isOffer(campaign) ? buckets.offers : buckets.ads).push(campaign);
    }
    return buckets;
  }, [campaignsQuery.data]);

  const items = activeTab === "ads" ? ads : offers;
  const copy = COPY[activeTab];

  const tabs: SegmentItem[] = useMemo(
    () => [
      { key: "ads", label: "Advertisements", count: ads.length },
      { key: "offers", label: "Offers", count: offers.length }
    ],
    [ads.length, offers.length]
  );

  const liveCount = useMemo(() => items.filter((item) => item.is_active).length, [items]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
  }, []);

  /* ---------------------------------------------------------------- *
   * Mutations. Each one carries its target id in `variables`, which is
   * what lets a single row show a spinner instead of the whole screen.
   * ---------------------------------------------------------------- */

  const createCampaign = useMutation({
    mutationFn: async (values: { title: string; targetUrl: string; imageUri: string; tab: TabKey }) => {
      const formData = new FormData();
      formData.append("title", storedTitle(values.title, values.tab));
      formData.append("target_url", values.targetUrl.trim());
      await appendImage(formData, values.imageUri);
      await apiClient.post("/admin/advertisements", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    },
    onSuccess: (_data, values) => {
      setComposerOpen(false);
      refresh();
      notify("Published", `The ${COPY[values.tab].one} is live on the storefront.`);
    },
    onError: (error) => notify("Upload failed", errorMessage(error, "The campaign was not created."))
  });

  const toggleActive = useMutation({
    mutationFn: async (values: { id: string; next: boolean }) =>
      apiClient.patch(`/admin/advertisements/${values.id}`, { is_active: values.next }),
    onSuccess: refresh,
    onError: (error) => notify("Couldn't change status", errorMessage(error, "The campaign was not changed."))
  });

  const deleteCampaign = useMutation({
    mutationFn: async (values: { id: string }) => apiClient.delete(`/admin/advertisements/${values.id}`),
    onSuccess: refresh,
    onError: (error) => notify("Couldn't delete", errorMessage(error, "The campaign was not deleted."))
  });

  const saveEdit = useMutation({
    mutationFn: async (values: { id: string; title: string; targetUrl: string; imageUri: string | null; tab: TabKey }) => {
      const formData = new FormData();
      formData.append("title", storedTitle(values.title, values.tab));
      formData.append("target_url", values.targetUrl.trim());
      if (values.imageUri) await appendImage(formData, values.imageUri);
      await apiClient.patch(`/admin/advertisements/${values.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    },
    onSuccess: () => {
      setEditingId(null);
      refresh();
    },
    onError: (error) => notify("Couldn't save changes", errorMessage(error, "Your edits were not saved."))
  });

  /** The row currently waiting on the server, so only that row shows a spinner. */
  const busyId =
    (toggleActive.isPending && toggleActive.variables?.id) ||
    (deleteCampaign.isPending && deleteCampaign.variables?.id) ||
    null;

  const onDelete = useCallback(
    (campaign: Advertisement) => {
      confirmAction(
        "Delete this campaign?",
        `"${displayTitle(campaign.title)}" will be removed permanently. Pause it instead if you only want it off the storefront for now.`,
        () => deleteCampaign.mutate({ id: campaign.id }),
        { confirmLabel: "Delete" }
      );
    },
    [deleteCampaign]
  );

  const onSwitchTab = useCallback((key: string) => {
    setActiveTab(key as TabKey);
    setEditingId(null);
    setComposerOpen(false);
  }, []);

  // Nothing to manage yet: opening the composer for them saves a tap and explains the screen.
  const showComposer = composerOpen || (!campaignsQuery.isLoading && !campaignsQuery.error && items.length === 0);

  return (
    <Screen scroll bottomNavItems={[]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(admin)" as any))}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
      >
        <ArrowLeftIcon size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.badgeRow}>
        <AdsIcon size={14} color={colors.accent} />
        <Text style={styles.eyebrow}>Marketing</Text>
      </View>

      <AdminHeader
        title="Marketing Hub"
        subtitle={
          campaignsQuery.error
            ? "Campaigns could not be loaded"
            : liveCount > 0
              ? `${liveCount} of ${items.length} ${copy.section.toLowerCase()} live on the storefront`
              : `No ${copy.section.toLowerCase()} are live right now`
        }
      />
      <FreshnessLabel
        updatedAt={campaignsQuery.dataUpdatedAt || undefined}
        isFetching={campaignsQuery.isFetching}
        style={styles.freshness}
      />

      <SegmentedTabs items={tabs} value={activeTab} onChange={onSwitchTab} scrollable={false} />

      {/* Composer is collapsed by default. The form previously filled the entire first screen, so
          the campaigns an operator came here to manage were always below the fold. */}
      {showComposer ? (
        <CampaignComposer
          // Remounting on tab change is what resets the draft. The old screen cleared the title and
          // image by hand and forgot the target URL, which then leaked into the other tab.
          key={activeTab}
          tab={activeTab}
          styles={styles}
          colors={colors}
          isSubmitting={createCampaign.isPending}
          onSubmit={(values) => createCampaign.mutate({ ...values, tab: activeTab })}
          onClose={items.length === 0 ? undefined : () => setComposerOpen(false)}
        />
      ) : (
        <Pressable
          onPress={() => setComposerOpen(true)}
          style={({ pressed }) => [styles.composerCta, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <View style={styles.composerCtaIcon}>
            <PlusIcon size={16} color={colors.accent} strokeWidth={2.6} />
          </View>
          <Text style={styles.composerCtaLabel}>{copy.create}</Text>
        </Pressable>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{copy.section}</Text>
        {items.length > 0 ? (
          <Text style={styles.listCount}>
            {liveCount} live · {items.length - liveCount} paused
          </Text>
        ) : null}
      </View>

      <QueryBoundary
        isLoading={campaignsQuery.isLoading}
        error={campaignsQuery.error}
        onRetry={campaignsQuery.refetch}
        isEmpty={items.length === 0}
        skeleton={<SkeletonRows count={3} />}
        empty={
          <EmptyState
            icon={ImageIcon}
            title={`No ${copy.section.toLowerCase()} yet`}
            message={`Publish your first ${copy.one} and it appears on the buyer home screen straight away.`}
          />
        }
      >
        <View style={styles.list}>
          {items.map((campaign) =>
            editingId === campaign.id ? (
              <CampaignEditor
                key={campaign.id}
                campaign={campaign}
                tab={activeTab}
                styles={styles}
                colors={colors}
                isSaving={saveEdit.isPending}
                onCancel={() => setEditingId(null)}
                onSave={(values) => saveEdit.mutate({ id: campaign.id, tab: activeTab, ...values })}
              />
            ) : (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                styles={styles}
                colors={colors}
                busy={busyId === campaign.id}
                onEdit={() => setEditingId(campaign.id)}
                onToggle={() => toggleActive.mutate({ id: campaign.id, next: !campaign.is_active })}
                onDelete={() => onDelete(campaign)}
              />
            )
          )}
        </View>
      </QueryBoundary>

      <View style={styles.tail} />
    </Screen>
  );
}

/* ------------------------------------------------------------------ *
 * Row
 * ------------------------------------------------------------------ */

type RowProps = {
  campaign: Advertisement;
  styles: ReturnType<typeof getStyles>;
  colors: any;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
};

function CampaignRow({ campaign, styles, colors, busy, onEdit, onToggle, onDelete }: RowProps) {
  const live = campaign.is_active;
  return (
    <Surface style={styles.row} elevation="sm">
      {/* 16:9, matching the aspect the picker crops to. The old 60x60 square cut the middle out of
          every banner, so the thumbnail rarely resembled what buyers would see. */}
      <Image
        source={sizedImageUrl(campaign.image_url, THUMB_RENDITION)}
        style={styles.thumb}
        contentFit="cover"
        transition={150}
        // ⚡ PERFORMANCE: memory-disk keeps the decoded bitmap around while the operator scrolls and
        // toggles, instead of re-decoding from disk on each pass. Bounded by the small campaign count.
        cachePolicy="memory-disk"
      />

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {displayTitle(campaign.title)}
        </Text>
        <Text style={styles.rowTarget} numberOfLines={1}>
          {campaign.target_url || "No target set — the banner is not tappable"}
        </Text>
        <StatusPill
          label={live ? "Live" : "Paused"}
          color={live ? colors.success : colors.textMuted}
          tint={withAlpha(live ? colors.success : colors.textMuted, 0.12)}
          style={styles.rowPill}
        />
      </View>

      <View style={styles.rowActions}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.accent} style={styles.rowSpinner} />
        ) : (
          <>
            <RowAction
              icon={EditIcon}
              label={`Edit ${displayTitle(campaign.title)}`}
              onPress={onEdit}
              styles={styles}
              color={colors.textSecondary}
            />
            <RowAction
              icon={live ? PauseIcon : PlayIcon}
              label={live ? `Pause ${displayTitle(campaign.title)}` : `Resume ${displayTitle(campaign.title)}`}
              onPress={onToggle}
              styles={styles}
              color={live ? colors.warning : colors.success}
            />
            <RowAction
              icon={TrashIcon}
              label={`Delete ${displayTitle(campaign.title)}`}
              onPress={onDelete}
              styles={styles}
              color={colors.danger}
            />
          </>
        )}
      </View>
    </Surface>
  );
}

function RowAction({
  icon: Icon,
  label,
  onPress,
  styles,
  color
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof getStyles>;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      // 32dp box plus 8dp of slop clears the 44dp minimum without widening the row.
      hitSlop={8}
      style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}
    >
      <Icon size={18} color={color} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Composer
 *
 * Draft state lives here rather than in the screen. That is deliberate: when it sat in the parent,
 * every character typed into the title re-rendered the whole campaign list underneath it.
 * ------------------------------------------------------------------ */

type ComposerProps = {
  tab: TabKey;
  styles: ReturnType<typeof getStyles>;
  colors: any;
  isSubmitting: boolean;
  onSubmit: (values: { title: string; targetUrl: string; imageUri: string }) => void;
  /** Absent while the list is empty - there is nothing to collapse back to. */
  onClose?: () => void;
};

function CampaignComposer({ tab, styles, colors, isSubmitting, onSubmit, onClose }: ComposerProps) {
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const copy = COPY[tab];

  const onPick = useCallback(async () => {
    try {
      const uri = await pickBanner();
      if (uri) setImageUri(uri);
    } catch (error) {
      notify("Couldn't open your photos", errorMessage(error, "Check the app's photo permission and try again."));
    }
  }, []);

  // The button used to be permanently enabled and answered a missing field with an alert that was
  // invisible on web. The requirement is now stated up front and the control reflects it.
  const ready = title.trim().length > 0 && Boolean(imageUri);

  return (
    <Surface style={styles.composer} elevation="md">
      <View style={styles.composerHeader}>
        <Text style={styles.composerTitle}>{tab === "ads" ? "Launch new advertisement" : "Create promotional offer"}</Text>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close the form">
            <XIcon size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Field label={tab === "ads" ? "Campaign title" : "Offer title"} required styles={styles}>
        <Input
          placeholder={tab === "ads" ? "e.g. Summer Sale 2026" : "e.g. Flash Sale 60% off"}
          value={title}
          onChangeText={setTitle}
          style={styles.field}
          returnKeyType="next"
          maxLength={80}
        />
      </Field>

      <Field label="Target URL or product ID" hint="Optional — where tapping the banner takes a buyer" styles={styles}>
        <Input
          placeholder="e.g. omq-spices-01"
          value={targetUrl}
          onChangeText={setTargetUrl}
          style={styles.field}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>

      <Field label="Banner artwork" hint="16:9 — it fills the width of the buyer home carousel" required styles={styles}>
        <Pressable
          onPress={onPick}
          style={({ pressed }) => [styles.picker, imageUri && styles.pickerFilled, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={imageUri ? "Change the banner image" : "Select a banner image"}
        >
          {imageUri ? (
            <>
              <Image source={imageUri} style={styles.pickerImage} contentFit="cover" transition={150} />
              <View style={styles.pickerOverlay}>
                <Text style={styles.pickerOverlayText}>Tap to change</Text>
              </View>
            </>
          ) : (
            <View style={styles.pickerEmpty}>
              <ImageIcon size={22} color={colors.textMuted} />
              <Text style={styles.pickerEmptyText}>Tap to select an image</Text>
            </View>
          )}
        </Pressable>
      </Field>

      <Pressable
        onPress={() => onSubmit({ title, targetUrl, imageUri: imageUri! })}
        disabled={!ready || isSubmitting}
        style={({ pressed }) => [styles.submit, (!ready || isSubmitting) && styles.submitDisabled, pressed && ready && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready || isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitLabel}>Publish {copy.one}</Text>
        )}
      </Pressable>

      {!ready && !isSubmitting ? (
        <Text style={styles.submitHint}>A title and a banner image are required.</Text>
      ) : null}
    </Surface>
  );
}

/* ------------------------------------------------------------------ *
 * Inline editor
 * ------------------------------------------------------------------ */

type EditorProps = {
  campaign: Advertisement;
  tab: TabKey;
  styles: ReturnType<typeof getStyles>;
  colors: any;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (values: { title: string; targetUrl: string; imageUri: string | null }) => void;
};

function CampaignEditor({ campaign, styles, colors, isSaving, onCancel, onSave }: EditorProps) {
  const [title, setTitle] = useState(() => displayTitle(campaign.title));
  const [targetUrl, setTargetUrl] = useState(campaign.target_url ?? "");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const onPick = useCallback(async () => {
    try {
      const uri = await pickBanner();
      if (uri) setImageUri(uri);
    } catch (error) {
      notify("Couldn't open your photos", errorMessage(error, "Check the app's photo permission and try again."));
    }
  }, []);

  const ready = title.trim().length > 0;

  return (
    <Surface style={styles.editor} elevation="md">
      <View style={styles.composerHeader}>
        <Text style={styles.composerTitle}>Edit campaign</Text>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Discard changes">
          <XIcon size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Field label="Title" required styles={styles}>
        <Input value={title} onChangeText={setTitle} style={styles.field} placeholder="Title" maxLength={80} />
      </Field>

      <Field label="Target URL or product ID" styles={styles}>
        <Input
          value={targetUrl}
          onChangeText={setTargetUrl}
          style={styles.field}
          placeholder="e.g. omq-spices-01"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>

      <Field label="Banner artwork" styles={styles}>
        <Pressable
          onPress={onPick}
          style={({ pressed }) => [styles.picker, styles.pickerFilled, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Change the banner image"
        >
          <Image
            // A local draft URI must not be rewritten; only the stored remote one is resized.
            source={imageUri ?? sizedImageUrl(campaign.image_url, PREVIEW_RENDITION)}
            style={styles.pickerImage}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
          <View style={styles.pickerOverlay}>
            <Text style={styles.pickerOverlayText}>{imageUri ? "New image selected — tap to change" : "Tap to change"}</Text>
          </View>
        </Pressable>
      </Field>

      <View style={styles.editorActions}>
        <Pressable
          onPress={onCancel}
          disabled={isSaving}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          {/* This button used to be white text on a near-white fill, i.e. invisible. */}
          <Text style={styles.secondaryBtnLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => onSave({ title, targetUrl, imageUri })}
          disabled={!ready || isSaving}
          style={({ pressed }) => [styles.primaryBtn, (!ready || isSaving) && styles.submitDisabled, pressed && ready && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready || isSaving }}
        >
          {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryBtnLabel}>Save changes</Text>}
        </Pressable>
      </View>
    </Surface>
  );
}

/* ------------------------------------------------------------------ *
 * Field label + hint
 * ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  required,
  styles,
  children
}: {
  label: string;
  hint?: string;
  required?: boolean;
  styles: ReturnType<typeof getStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required ? <Text style={styles.fieldRequired}>Required</Text> : null}
      </View>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */

const getStyles = (colors: any) =>
  StyleSheet.create({
    backBtn: {
      padding: SPACE.sm,
      marginLeft: -SPACE.sm,
      marginBottom: SPACE.xs
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: SPACE.xs
    },
    eyebrow: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase"
    },
    freshness: {
      marginTop: -SPACE.sm,
      marginBottom: SPACE.lg
    },

    /* Composer -------------------------------------------------- */
    composerCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.md,
      marginTop: SPACE.lg,
      paddingVertical: SPACE.lg,
      paddingHorizontal: SPACE.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: withAlpha(colors.accent, 0.4),
      backgroundColor: withAlpha(colors.accent, 0.05)
    },
    composerCtaIcon: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(colors.accent, 0.12)
    },
    composerCtaLabel: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "700"
    },
    composer: {
      marginTop: SPACE.lg,
      padding: SPACE.xl
    },
    composerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACE.lg
    },
    composerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.3
    },

    /* Fields ---------------------------------------------------- */
    fieldGroup: {
      marginBottom: SPACE.lg
    },
    fieldLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACE.sm
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.4
    },
    fieldRequired: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6
    },
    fieldHint: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 6,
      lineHeight: 15
    },
    field: {
      // `colors.surface` does not exist on the theme, so every input, tab and picker on this screen
      // was styled with `backgroundColor: undefined` and `borderColor: undefined` - transparent
      // boxes with no edge. These are the real tokens.
      backgroundColor: colors.card2,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: RADIUS.md,
      color: colors.textPrimary,
      minHeight: 52
    },

    /* Image picker ---------------------------------------------- */
    picker: {
      // 16:9 so the frame matches what the crop tool produces and what buyers see.
      aspectRatio: 16 / 9,
      width: "100%",
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border2,
      backgroundColor: colors.card2,
      overflow: "hidden"
    },
    pickerFilled: {
      borderStyle: "solid",
      borderColor: colors.border
    },
    pickerEmpty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACE.sm
    },
    pickerEmptyText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 13
    },
    pickerImage: {
      width: "100%",
      height: "100%"
    },
    pickerOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingVertical: 7,
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.55)"
    },
    pickerOverlayText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700"
    },

    /* Buttons --------------------------------------------------- */
    submit: {
      backgroundColor: colors.accent,
      paddingVertical: SPACE.lg,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      marginTop: SPACE.xs
    },
    submitDisabled: {
      opacity: 0.45
    },
    submitLabel: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 15,
      letterSpacing: 0.2
    },
    submitHint: {
      color: colors.textMuted,
      fontSize: 11,
      textAlign: "center",
      marginTop: SPACE.sm
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: SPACE.xl,
      paddingVertical: SPACE.md,
      borderRadius: RADIUS.sm,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryBtnLabel: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 14
    },
    secondaryBtn: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: SPACE.xl,
      paddingVertical: SPACE.md,
      borderRadius: RADIUS.sm,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center"
    },
    secondaryBtnLabel: {
      color: colors.textSecondary,
      fontWeight: "700",
      fontSize: 14
    },
    pressed: {
      opacity: 0.7
    },

    /* List ------------------------------------------------------ */
    listHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginTop: SPACE.xxl,
      marginBottom: SPACE.lg
    },
    listTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.3
    },
    listCount: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted
    },
    list: {
      gap: SPACE.md
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: SPACE.md,
      gap: SPACE.md
    },
    thumb: {
      width: 112,
      aspectRatio: 16 / 9,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.bgTertiary
    },
    rowBody: {
      flex: 1,
      minWidth: 0
    },
    rowTitle: {
      color: colors.textPrimary,
      fontWeight: "700",
      fontSize: 15,
      lineHeight: 20
    },
    rowTarget: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2
    },
    rowPill: {
      marginTop: SPACE.sm
    },
    rowActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.xs
    },
    rowAction: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: RADIUS.sm
    },
    rowSpinner: {
      width: 104
    },

    /* Editor ---------------------------------------------------- */
    editor: {
      padding: SPACE.lg
    },
    editorActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: SPACE.md,
      marginTop: SPACE.xs
    },

    tail: {
      height: 60
    }
  });
