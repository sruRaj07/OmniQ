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
import { MapPinIcon } from "@/components/ui/SellerIcons";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { QueryBoundary, SkeletonRows } from "@/components/admin/AdminUI";
import { notify } from "@/utils/dialog";

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
  const [newZoneLat, setNewZoneLat] = useState<number | null>(null);
  const [newZoneLng, setNewZoneLng] = useState<number | null>(null);
  const [newRadiusKm, setNewRadiusKm] = useState("10");
  const [initialPincode, setInitialPincode] = useState("");
  const [capturingGps, setCapturingGps] = useState(false);
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

  const handleCaptureLocation = () => {
    setCapturingGps(true);
    setCreateError(null);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCapturingGps(false);
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setNewZoneLat(lat);
          setNewZoneLng(lng);
        },
        (err) => {
          setCapturingGps(false);
          console.warn("GPS error:", err);
          setCreateError("Could not capture GPS location. Please check device location permissions.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setCapturingGps(false);
      setCreateError("Geolocation is not supported on this device.");
    }
  };

  const createZone = useMutation({
    mutationFn: async ({
      name,
      lat,
      lng,
      radiusKm,
      pinCode
    }: {
      name: string;
      lat: number;
      lng: number;
      radiusKm: number;
      pinCode?: string;
    }) => {
      await apiClient.post("/admin/zones", {
        name,
        centreLat: lat,
        centreLng: lng,
        radiusKm,
        pinCodes: pinCode ? [pinCode] : []
      });
    },
    onSuccess: () => {
      setNewZoneName("");
      setNewZoneLat(null);
      setNewZoneLng(null);
      setNewRadiusKm("10");
      setInitialPincode("");
      setCreateError(null);
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ZONES_KEY });
      queryClient.invalidateQueries({ queryKey: ["adminSellers"] });
      notify("Warehouse Created", "New warehouse registered and nearby sellers auto-assigned.");
    },
    onError: (err: any) => setCreateError(messageOf(err, "Could not create the zone."))
  }, queryClient);

  const handleCreate = () => {
    const name = newZoneName.trim();
    if (name.length < 2) {
      setCreateError("Enter a warehouse/zone name of at least 2 characters.");
      return;
    }
    const radius = Number(newRadiusKm) || 10;
    const pin = initialPincode.trim();
    if (pin && !PINCODE_PATTERN.test(pin)) {
      setCreateError("Enter a valid 6-digit initial pincode or leave blank.");
      return;
    }

    setCreateError(null);
    createZone.mutate({
      name,
      lat: newZoneLat ?? 0,
      lng: newZoneLng ?? 0,
      radiusKm: radius,
      pinCode: pin || undefined
    });
  };

  const toggleAdding = () => {
    setIsAdding(prev => !prev);
    setCreateError(null);
    setNewZoneLat(null);
    setNewZoneLng(null);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Delivery Zones & Warehouses</Text>
          <Text style={styles.subtitle}>
            {zones?.length ? `${zones.length} warehouse hub${zones.length === 1 ? "" : "s"} · buyers served from nearest hub` : "Manage active fulfillment hubs and service areas"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addZoneButton, isAdding && styles.addZoneButtonActive]}
          onPress={toggleAdding}
          accessibilityRole="button"
          accessibilityLabel={isAdding ? "Cancel new zone" : "Create a new delivery zone"}
        >
          <Text style={styles.addZoneButtonText}>{isAdding ? "Cancel" : "+ New Hub"}</Text>
        </TouchableOpacity>
      </View>

      {isAdding && (
        <View style={styles.newZoneCard}>
          <Text style={styles.newZoneTitle}>Register New Warehouse / Hub</Text>
          <Text style={styles.inputLabel}>Warehouse Name *</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Karandighi Central Warehouse"
            placeholderTextColor={colors.textSecondary}
            value={newZoneName}
            onChangeText={setNewZoneName}
            returnKeyType="next"
            autoFocus
          />

          <Text style={styles.inputLabel}>Physical GPS Location</Text>
          <Text style={styles.helperText}>
            Stand at the warehouse and tap below to register its exact coordinates so deliveries are dispatched from here.
          </Text>
          <TouchableOpacity
            style={[styles.gpsButton, capturingGps && styles.buttonDisabled]}
            onPress={handleCaptureLocation}
            disabled={capturingGps}
          >
            {capturingGps ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MapPinIcon size={16} color="#FFF" strokeWidth={2.4} />
            )}
            <Text style={styles.gpsButtonText}>
              {capturingGps ? "Capturing exact GPS position…" : "📍 Capture My Exact GPS Location"}
            </Text>
          </TouchableOpacity>

          {newZoneLat !== null && newZoneLng !== null ? (
            <View style={styles.gpsSuccessBadge}>
              <Text style={styles.gpsSuccessText}>
                ✓ GPS Coordinates: {newZoneLat}° N, {newZoneLng}° E
              </Text>
            </View>
          ) : null}

          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.inputLabel}>Coverage Radius (km)</Text>
              <TextInput
                style={styles.compactInput}
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
                value={newRadiusKm}
                keyboardType="numeric"
                onChangeText={setNewRadiusKm}
              />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.inputLabel}>Initial Pincode (Optional)</Text>
              <TextInput
                style={styles.compactInput}
                placeholder="e.g. 733215"
                placeholderTextColor={colors.textSecondary}
                value={initialPincode}
                keyboardType="numeric"
                maxLength={6}
                onChangeText={setInitialPincode}
              />
            </View>
          </View>

          {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
          <TouchableOpacity
            style={[styles.primaryButton, createZone.isPending && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={createZone.isPending}
          >
            {createZone.isPending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.primaryButtonText}>Register Warehouse & Hub</Text>}
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
  const [updatingGps, setUpdatingGps] = useState(false);

  const updateZone = useMutation({
    mutationFn: async ({
      updatedPinCodes,
      updatedName,
      updatedLat,
      updatedLng,
      updatedRadiusKm
    }: {
      updatedPinCodes?: string[];
      updatedName?: string;
      updatedLat?: number;
      updatedLng?: number;
      updatedRadiusKm?: number;
    }) => {
      await apiClient.post("/admin/zones", {
        id: zone.id,
        name: updatedName || zone.name,
        centreLat: updatedLat !== undefined ? updatedLat : (zone.lat ?? 0),
        centreLng: updatedLng !== undefined ? updatedLng : (zone.lng ?? 0),
        radiusKm: updatedRadiusKm !== undefined ? updatedRadiusKm : (zone.radius_km || 10),
        pinCodes: updatedPinCodes !== undefined ? updatedPinCodes : (zone.supported_pincodes || [])
      });
    },
    // ⚡ PERFORMANCE: applied to the cache before the request leaves. Adding or removing a pincode
    // used to mean a POST, then invalidate, then a full re-fetch of every zone before the chip
    // moved - two round-trips of dead time per tap on an admin's connection. The edit now lands
    // instantly and the network settles behind it; onError puts the old list back if it fails.
    onMutate: async ({ updatedPinCodes, updatedName, updatedLat, updatedLng, updatedRadiusKm }) => {
      await queryClient.cancelQueries({ queryKey: ZONES_KEY });
      const previous = queryClient.getQueryData<Zone[]>(ZONES_KEY);
      queryClient.setQueryData<Zone[]>(ZONES_KEY, old =>
        (old || []).map(z =>
          z.id === zone.id
            ? {
                ...z,
                supported_pincodes: updatedPinCodes !== undefined ? updatedPinCodes : z.supported_pincodes,
                name: updatedName || z.name,
                lat: updatedLat !== undefined ? updatedLat : z.lat,
                lng: updatedLng !== undefined ? updatedLng : z.lng,
                radius_km: updatedRadiusKm !== undefined ? updatedRadiusKm : z.radius_km
              }
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ZONES_KEY });
      queryClient.invalidateQueries({ queryKey: ["adminSellers"] });
    }
  }, queryClient);

  const handleCalibrateGps = () => {
    setUpdatingGps(true);
    setCardError(null);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUpdatingGps(false);
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          updateZone.mutate({ updatedLat: lat, updatedLng: lng });
          notify("Location Updated", `Warehouse location set to ${lat}, ${lng}. Nearby sellers auto-assigned.`);
        },
        (err) => {
          setUpdatingGps(false);
          console.warn("GPS error:", err);
          setCardError("Could not capture GPS location. Check device location permissions.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setUpdatingGps(false);
      setCardError("Geolocation is not supported on this device.");
    }
  };


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
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
              <MapPinIcon size={12} color={colors.accent} strokeWidth={2.4} />
              <Text style={styles.zoneCoords}>
                {zone.lat && zone.lng && (Number(zone.lat) !== 0 || Number(zone.lng) !== 0)
                  ? `${Number(zone.lat).toFixed(4)}, ${Number(zone.lng).toFixed(4)} · ${zone.radius_km || 10} km radius`
                  : "GPS location not calibrated"}
              </Text>
            </View>
            <Text style={styles.zoneMeta}>
              {pins.length === 0 ? "No pincodes — not serviceable" : `${pins.length} covered pincode${pins.length === 1 ? "" : "s"}`}
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
            style={[styles.gpsFooterButton, updatingGps && styles.buttonDisabled]}
            onPress={handleCalibrateGps}
            disabled={updatingGps || updateZone.isPending}
            accessibilityRole="button"
            accessibilityLabel={`Set GPS Location for ${zone.name}`}
          >
            {updatingGps ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <MapPinIcon size={13} color={colors.accent} strokeWidth={2.4} />
            )}
            <Text style={styles.gpsFooterButtonText}>
              {updatingGps ? "Calibrating…" : "Set GPS Location"}
            </Text>
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
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12
  },
  headerContent: {
    flex: 1,
    minWidth: 180
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.5
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  addZoneButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    alignSelf: "flex-start"
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20
  },
  formRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8
  },
  formCol: {
    flex: 1,
    minWidth: 130
  },
  newZoneTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16
  },
  inputLabel: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10
  },
  compactInput: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600"
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 8
  },
  gpsButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1
  },
  gpsSuccessBadge: {
    backgroundColor: "rgba(22, 163, 74, 0.12)",
    borderColor: "rgba(22, 163, 74, 0.35)",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8
  },
  gpsSuccessText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "700"
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14
  },
  headerTextBlock: {
    flex: 1
  },
  zoneName: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "700"
  },
  zoneMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4
  },
  zoneCoords: {
    color: colors.accent,
    fontSize: 11.5,
    fontWeight: "700",
    flexShrink: 1
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
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8
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
    gap: 10,
    alignItems: "center",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "500"
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 64,
    minHeight: 42
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13
  },
  cardFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  footerButton: {
    flexGrow: 1,
    flexBasis: "25%",
    minWidth: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
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
  gpsFooterButton: {
    flexGrow: 1,
    flexBasis: "42%",
    minWidth: 135,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(59, 130, 246, 0.08)"
  },
  gpsFooterButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  deleteButton: {
    flexGrow: 1,
    flexBasis: "24%",
    minWidth: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
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
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 20
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
