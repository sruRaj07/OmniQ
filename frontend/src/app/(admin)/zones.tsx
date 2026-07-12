/**
 * OmniQ mobile app - admin zones screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Screen } from "@/components/shared/Screen";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { useAppTheme } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
export default function AdminZonesScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const [isAdding, setIsAdding] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const {
    data: zones,
    isLoading
  } = useQuery({
    queryKey: ["adminZones"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/zones");
      return res.data.data;
    }
  }, queryClient);
  const createZone = useMutation({
    mutationFn: async () => {
      await apiClient.post("/admin/zones", {
        name: newZoneName,
        centreLat: 0,
        centreLng: 0,
        radiusKm: 10,
        pinCodes: []
      });
    },
    onSuccess: () => {
      setNewZoneName("");
      setIsAdding(false);
      queryClient.invalidateQueries({
        queryKey: ["adminZones"]
      });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  }, queryClient);
  const handleCreate = () => {
    if (!newZoneName.trim()) return;
    createZone.mutate();
  };
  return <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Delivery Zones</Text>
          <Text style={styles.subtitle}>Manage active regions and service areas</Text>
        </View>
        <TouchableOpacity style={styles.addZoneButton} onPress={() => setIsAdding(!isAdding)}>
          <Text style={styles.addZoneButtonText}>{isAdding ? "Cancel" : "+ New Zone"}</Text>
        </TouchableOpacity>
      </View>

      {isAdding && <View style={styles.newZoneCard}>
          <Text style={styles.newZoneTitle}>Create New Zone</Text>
          <TextInput style={styles.nameInput} placeholder="e.g. Mumbai South" placeholderTextColor={colors.textSecondary} value={newZoneName} onChangeText={setNewZoneName} autoFocus />
          <TouchableOpacity style={styles.saveNameButton} onPress={handleCreate} disabled={createZone.isPending}>
            {createZone.isPending ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Text style={styles.saveNameButtonText}>Create Zone</Text>}
          </TouchableOpacity>
        </View>}

      {isLoading ? <ActivityIndicator size="large" color="#4CAF50" style={{
      marginTop: 40
    }} /> : zones?.length === 0 ? <View style={styles.emptyState}>
          <ShieldIcon size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>No zones configured.</Text>
        </View> : <View style={styles.list}>
          {zones?.map((zone: any) => <ZoneCard key={zone.id} zone={zone} />)}
        </View>}
      <View style={{
      height: 60
    }} />
    </Screen>;
}
function ZoneCard({
  zone
}: {
  zone: any;
}) {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const [newPin, setNewPin] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(zone.name);
  const updateZone = useMutation({
    mutationFn: async ({
      updatedPinCodes,
      updatedName
    }: {
      updatedPinCodes: string[];
      updatedName?: string;
    }) => {
      await apiClient.post("/admin/zones", {
        id: zone.id,
        name: updatedName || zone.name,
        centreLat: zone.lat || zone.center_lat || 0,
        centreLng: zone.lng || zone.center_lng || 0,
        radiusKm: zone.radius_km || 10,
        pinCodes: updatedPinCodes
      });
    },
    onSuccess: () => {
      setNewPin("");
      setIsEditingName(false);
      queryClient.invalidateQueries({
        queryKey: ["adminZones"]
      });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  }, queryClient);
  const handleAddPin = () => {
    if (!newPin.trim()) return;
    const currentPins = zone.supported_pincodes || [];
    if (currentPins.includes(newPin.trim())) {
      Alert.alert("Notice", "Pin code already exists.");
      return;
    }
    updateZone.mutate({
      updatedPinCodes: [...currentPins, newPin.trim()]
    });
  };
  const handleRemovePin = (pinToRemove: string) => {
    const currentPins = zone.supported_pincodes || [];
    updateZone.mutate({
      updatedPinCodes: currentPins.filter((p: string) => p !== pinToRemove)
    });
  };
  const handleSaveName = () => {
    if (!editName.trim()) return;
    updateZone.mutate({
      updatedPinCodes: zone.supported_pincodes || [],
      updatedName: editName.trim()
    });
  };
  return <View style={styles.card}>
      <View style={styles.cardHeader}>
        {isEditingName ? <View style={styles.editNameRow}>
            <TextInput style={styles.nameInput} value={editName} onChangeText={setEditName} autoFocus />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setIsEditingName(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveNameButton} onPress={handleSaveName}>
                <Text style={styles.saveNameButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View> : <View style={styles.zoneNameRow}>
            <Text style={styles.zoneName}>{zone.name}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditingName(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>}
        {!isEditingName && <View style={styles.statusBadge}>
            <Text style={styles.badgeText}>{zone.status || "active"}</Text>
          </View>}
      </View>
      
      <View style={styles.pinCodes}>
        {zone.supported_pincodes?.map((pin: string) => <View key={pin} style={styles.pinBadgeContainer}>
            <Text style={styles.pinBadge}>{pin}</Text>
            <TouchableOpacity style={styles.removePinBtn} onPress={() => handleRemovePin(pin)}>
              <Text style={styles.removePinText}>×</Text>
            </TouchableOpacity>
          </View>)}
        {(!zone.supported_pincodes || zone.supported_pincodes.length === 0) && <Text style={styles.mutedText}>No pincodes assigned yet.</Text>}
      </View>

      <View style={styles.addPinContainer}>
        <TextInput style={styles.input} placeholder="New Pin Code" placeholderTextColor="rgba(255,255,255,0.3)" value={newPin} onChangeText={setNewPin} keyboardType="number-pad" maxLength={6} />
        <TouchableOpacity style={styles.addButton} onPress={handleAddPin} disabled={updateZone.isPending}>
          {updateZone.isPending ? <ActivityIndicator size="small" color="#6C63FF" /> : <Text style={styles.addButtonText}>Add</Text>}
        </TouchableOpacity>
      </View>
    </View>;
}
const getStyles = (colors: any) => StyleSheet.create({
  header: {
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500"
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
    marginBottom: 16
  },
  zoneNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
    gap: 12
  },
  zoneName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700"
  },
  editButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  editButtonText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "600"
  },
  editNameRow: {
    flex: 1,
    gap: 12
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
    gap: 16
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 13
  },
  saveNameButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  saveNameButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 13
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
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
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 14
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
    borderWidth: 1,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center"
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13
  }
});