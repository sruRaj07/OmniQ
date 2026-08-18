/**
 * OmniQ mobile app - admin zones screen.
 * Author: OmniQ Team
 */
// Explicit React import: this tsconfig uses the classic JSX transform, so a file rendering JSX
// without it resolves `React` to a UMD global and TypeScript reports TS2686 on every element.
import React, { useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity, Modal, Pressable } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Screen } from "@/components/shared/Screen";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { TrashIcon } from "@/components/ui/TrashIcon";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { QueryBoundary, SkeletonRows } from "@/components/admin/AdminUI";

const ZONES_KEY = ["adminZones"] as const;

// Indian pincodes are 6 digits and never start with 0. This screen decides who can order at all,
// so a typo'd 3-digit "pincode" silently making a region unserviceable is worth blocking here
// rather than discovering at someone's checkout.
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

/** The shape the list query holds. Only the fields this screen reads. */
type Zone = {
  id: string;
  name: string;
  supported_pincodes?: string[] | null;
  active?: boolean;
  lat?: number;
  lng?: number;
  radius_km?: number;
};

/**
 * ⚡ PERFORMANCE: getStyles builds a full StyleSheet, and it used to run on every render of every
 * card - N zones re-rendering meant N StyleSheet.create calls per keystroke in any input.
 * useThemeColors returns one frozen theme object for the app's lifetime (see useThemeStore), so the
 * result is cached against that object: the sheet is built once for the whole screen, not per card.
 */
let cachedColors: unknown = null;
let cachedStyles: ReturnType<typeof getStyles> | null = null;
function themedStyles(colors: any) {
  if (cachedColors !== colors || !cachedStyles) {
    cachedColors = colors;
    cachedStyles = getStyles(colors);
  }
  return cachedStyles;
}

/** Pulls a readable message out of an axios error, falling back through the API's error envelope. */
function messageOf(error: any, fallback: string): string {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default function AdminZonesScreen() {
  const colors = useThemeColors();
  const styles = themedStyles(colors);
  const [isAdding, setIsAdding] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  // Errors render inline rather than through Alert.alert. This console is used in a browser as
  // often as on a device, and react-native-web has no Alert implementation - an alert-only failure
  // path shows the admin nothing at all.
  const [createError, setCreateError] = useState<string | null>(null);

  const zonesQuery = useQuery({
    queryKey: ZONES_KEY,
    queryFn: async () => {
      const res = await apiClient.get("/admin/zones");
      return (res.data?.data || []) as Zone[];
    }
  });
  const zones = zonesQuery.data;

  const createZone = useMutation({
    mutationFn: async (name: string) => {
      await apiClient.post("/admin/zones", {
        name,
        centreLat: 0,
        centreLng: 0,
        radiusKm: 10,
        pinCodes: []
      });
    },
    onSuccess: () => {
      setNewZoneName("");
      setCreateError(null);
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ZONES_KEY });
    },
    onError: (err: any) => setCreateError(messageOf(err, "Could not create the zone."))
  }, queryClient);

  const handleCreate = () => {
    const name = newZoneName.trim();
    if (name.length < 2) {
      setCreateError("Enter a zone name of at least 2 characters.");
      return;
    }
    setCreateError(null);
    createZone.mutate(name);
  };

  const toggleAdding = () => {
    setIsAdding(prev => !prev);
    setCreateError(null);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Delivery Zones</Text>
          <Text style={styles.subtitle}>
            {zones?.length ? `${zones.length} zone${zones.length === 1 ? "" : "s"} · buyers can only order from a covered pincode` : "Manage active regions and service areas"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addZoneButton, isAdding && styles.addZoneButtonActive]}
          onPress={toggleAdding}
          accessibilityRole="button"
          accessibilityLabel={isAdding ? "Cancel new zone" : "Create a new delivery zone"}
        >
          <Text style={styles.addZoneButtonText}>{isAdding ? "Cancel" : "+ New Zone"}</Text>
        </TouchableOpacity>
      </View>

      {isAdding && (
        <View style={styles.newZoneCard}>
          <Text style={styles.newZoneTitle}>Create New Zone</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Mumbai South"
            placeholderTextColor={colors.textSecondary}
            value={newZoneName}
            onChangeText={setNewZoneName}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
            autoFocus
          />
          <Text style={styles.helperText}>Add pincodes to the zone once it exists.</Text>
          {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
          <TouchableOpacity
            style={[styles.primaryButton, createZone.isPending && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={createZone.isPending}
          >
            {createZone.isPending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.primaryButtonText}>Create Zone</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* A failed zone fetch used to render as "No zones configured" - which reads as "delivery is
          switched off platform-wide" and is the single most alarming thing this screen can say.
          QueryBoundary keeps the two apart. */}
      <QueryBoundary
        isLoading={zonesQuery.isLoading}
        error={zonesQuery.error}
        onRetry={zonesQuery.refetch}
        isEmpty={zones?.length === 0}
        skeleton={<SkeletonRows count={3} />}
        empty={
          <View style={styles.emptyState}>
            <ShieldIcon size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No zones configured</Text>
            <Text style={styles.emptySubtext}>Without a zone, no pincode is serviceable and buyers cannot check out.</Text>
          </View>
        }
      >
        <View style={styles.list}>
          {zones?.map(zone => <ZoneCard key={zone.id} zone={zone} />)}
        </View>
      </QueryBoundary>
      <View style={{ height: 60 }} />
    </Screen>
  );
}

function ZoneCard({ zone }: { zone: Zone }) {
  const colors = useThemeColors();
  const styles = themedStyles(colors);
  const [newPin, setNewPin] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(zone.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const pins = zone.supported_pincodes || [];

  const updateZone = useMutation({
    mutationFn: async ({ updatedPinCodes, updatedName }: { updatedPinCodes: string[]; updatedName?: string }) => {
      await apiClient.post("/admin/zones", {
        id: zone.id,
        name: updatedName || zone.name,
        centreLat: zone.lat ?? 0,
        centreLng: zone.lng ?? 0,
        radiusKm: zone.radius_km || 10,
        pinCodes: updatedPinCodes
      });
    },
    // ⚡ PERFORMANCE: applied to the cache before the request leaves. Adding or removing a pincode
    // used to mean a POST, then invalidate, then a full re-fetch of every zone before the chip
    // moved - two round-trips of dead time per tap on an admin's connection. The edit now lands
    // instantly and the network settles behind it; onError puts the old list back if it fails.
    onMutate: async ({ updatedPinCodes, updatedName }) => {
      await queryClient.cancelQueries({ queryKey: ZONES_KEY });
      const previous = queryClient.getQueryData<Zone[]>(ZONES_KEY);
      queryClient.setQueryData<Zone[]>(ZONES_KEY, old =>
        (old || []).map(z =>
          z.id === zone.id
            ? { ...z, supported_pincodes: updatedPinCodes, name: updatedName || z.name }
            : z
        )
      );
      return { previous };
    },
    onSuccess: () => {
      setNewPin("");
      setIsEditingName(false);
      setCardError(null);
    },
    onError: (err: any, _vars, context) => {
      queryClient.setQueryData(ZONES_KEY, context?.previous);
      setCardError(messageOf(err, "Could not save the change."));
    },
    // Reconcile against the server once the dust settles, so an optimistic value can never stick.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ZONES_KEY })
  }, queryClient);

  const deleteZone = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/admin/zones/${zone.id}`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ZONES_KEY });
      const previous = queryClient.getQueryData<Zone[]>(ZONES_KEY);
      queryClient.setQueryData<Zone[]>(ZONES_KEY, old => (old || []).filter(z => z.id !== zone.id));
      return { previous };
    },
    onSuccess: () => setConfirmingDelete(false),
    onError: (err: any, _vars, context) => {
      // The card comes back on failure, so a zone never appears removed when it is still live.
      queryClient.setQueryData(ZONES_KEY, context?.previous);
      setConfirmingDelete(false);
      setCardError(messageOf(err, "Could not remove the zone."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ZONES_KEY })
  }, queryClient);

  const handleAddPin = () => {
    const pin = newPin.trim();
    if (!pin) return;
    if (!PINCODE_PATTERN.test(pin)) {
      setCardError("Enter a valid 6-digit pincode.");
      return;
    }
    if (pins.includes(pin)) {
      setCardError(`${pin} is already in this zone.`);
      return;
    }
    setCardError(null);
    updateZone.mutate({ updatedPinCodes: [...pins, pin] });
  };

  const handleRemovePin = (pinToRemove: string) => {
    setCardError(null);
    updateZone.mutate({ updatedPinCodes: pins.filter(p => p !== pinToRemove) });
  };

  const handleSaveName = () => {
    const name = editName.trim();
    if (name.length < 2) {
      setCardError("Enter a zone name of at least 2 characters.");
      return;
    }
    setCardError(null);
    updateZone.mutate({ updatedPinCodes: pins, updatedName: name });
  };

  const cancelNameEdit = () => {
    setEditName(zone.name);
    setIsEditingName(false);
    setCardError(null);
  };

  const isActive = zone.active !== false;

  return (
    <View style={styles.card}>
      {isEditingName ? (
        <View style={styles.editNameBlock}>
          <TextInput
            style={styles.nameInput}
            value={editName}
            onChangeText={setEditName}
            onSubmitEditing={handleSaveName}
            returnKeyType="done"
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.ghostButton} onPress={cancelNameEdit}>
              <Text style={styles.ghostButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButtonCompact, updateZone.isPending && styles.buttonDisabled]}
              onPress={handleSaveName}
              disabled={updateZone.isPending}
            >
              <Text style={styles.primaryButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.cardHeader}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.zoneName} numberOfLines={2}>{zone.name}</Text>
            <Text style={styles.zoneMeta}>
              {pins.length === 0 ? "No pincodes — not serviceable" : `${pins.length} pincode${pins.length === 1 ? "" : "s"}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, !isActive && styles.statusBadgeInactive]}>
            <Text style={[styles.badgeText, !isActive && styles.badgeTextInactive]}>
              {isActive ? "active" : "inactive"}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.pinCodes}>
        {pins.map(pin => (
          <View key={pin} style={styles.pinBadgeContainer}>
            <Text style={styles.pinBadge}>{pin}</Text>
            <TouchableOpacity
              style={styles.removePinBtn}
              onPress={() => handleRemovePin(pin)}
              accessibilityRole="button"
              accessibilityLabel={`Remove pincode ${pin} from ${zone.name}`}
              // The chip is small; widen the tappable area past its drawn bounds rather than
              // making the chip itself bigger and losing rows to whitespace.
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            >
              <Text style={styles.removePinText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {pins.length === 0 && <Text style={styles.mutedText}>No pincodes assigned yet.</Text>}
      </View>

      <View style={styles.addPinContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add pincode"
          placeholderTextColor={colors.textMuted}
          value={newPin}
          onChangeText={text => setNewPin(text.replace(/[^0-9]/g, ""))}
          onSubmitEditing={handleAddPin}
          returnKeyType="done"
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity
          style={[styles.addButton, updateZone.isPending && styles.buttonDisabled]}
          onPress={handleAddPin}
          disabled={updateZone.isPending}
        >
          {updateZone.isPending
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={styles.addButtonText}>Add</Text>}
        </TouchableOpacity>
      </View>

      {cardError ? <Text style={styles.errorText}>{cardError}</Text> : null}

      {!isEditingName && (
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.footerButton} onPress={() => setIsEditingName(true)}>
            <Text style={styles.footerButtonText}>Edit name</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setConfirmingDelete(true)}
            accessibilityRole="button"
            accessibilityLabel={`Remove zone ${zone.name}`}
          >
            <TrashIcon size={14} color={colors.danger} />
            <Text style={styles.deleteButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mounted only while open: a Modal per card would otherwise sit in the tree for every zone. */}
      {confirmingDelete && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmingDelete(false)}>
          <Pressable style={styles.modalBg} onPress={() => setConfirmingDelete(false)}>
            {/* Swallows the backdrop press so tapping inside the dialog does not dismiss it. */}
            <Pressable style={styles.confirmCard} onPress={() => {}}>
              <Text style={styles.confirmTitle}>Remove this zone?</Text>
              <Text style={styles.confirmZoneName}>{zone.name}</Text>
              <Text style={styles.confirmBody}>
                {pins.length > 0
                  ? `Buyers in ${pins.length} pincode${pins.length === 1 ? "" : "s"} (${pins.slice(0, 3).join(", ")}${pins.length > 3 ? `, +${pins.length - 3} more` : ""}) will no longer be able to place orders, unless another zone covers them.`
                  : "This zone has no pincodes, so removing it will not change what buyers can order."}
              </Text>
              <Text style={styles.confirmFootnote}>
                The zone is archived rather than erased, so it can be restored if this was a mistake.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={styles.ghostButton} onPress={() => setConfirmingDelete(false)}>
                  <Text style={styles.ghostButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmDeleteButton, deleteZone.isPending && styles.buttonDisabled]}
                  onPress={() => deleteZone.mutate()}
                  disabled={deleteZone.isPending}
                >
                  {deleteZone.isPending
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={styles.confirmDeleteText}>Remove zone</Text>}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  header: {
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  headerContent: {
    flex: 1
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.5
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  addZoneButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8
  },
  addZoneButtonActive: {
    borderColor: colors.accent
  },
  addZoneButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 13
  },
  newZoneCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24
  },
  newZoneTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24
  },
  emptyText: {
    color: colors.textPrimary,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700"
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18
  },
  list: {
    gap: 16
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16
  },
  headerTextBlock: {
    flex: 1
  },
  zoneName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700"
  },
  zoneMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4
  },
  editNameBlock: {
    gap: 12,
    marginBottom: 16
  },
  nameInput: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600"
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12
  },
  ghostButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  ghostButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 13
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48
  },
  primaryButtonCompact: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13
  },
  buttonDisabled: {
    opacity: 0.6
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 13
  },
  statusBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  statusBadgeInactive: {
    borderColor: colors.textMuted
  },
  badgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  badgeTextInactive: {
    color: colors.textMuted
  },
  pinCodes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  pinBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    overflow: "hidden"
  },
  pinBadge: {
    color: colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: "600"
  },
  removePinBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderColor: colors.border
  },
  removePinText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 16
  },
  addPinContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: "500"
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 72,
    minHeight: 44
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  footerButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  footerButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600"
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700"
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  confirmCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "800"
  },
  confirmZoneName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10
  },
  confirmBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8
  },
  confirmFootnote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 24
  },
  confirmDeleteButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 130
  },
  confirmDeleteText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13
  }
});
