/**
 * OmniQ mobile app - admin zones screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/shared/Screen";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";
import { LinearGradient } from "expo-linear-gradient";

export default function AdminZonesScreen() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  
  const { data: zones, isLoading } = useQuery({
    queryKey: ["adminZones"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/zones");
      return res.data.data;
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["adminZones"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  });

  const handleCreate = () => {
    if (!newZoneName.trim()) return;
    createZone.mutate();
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.badgeRow}>
            <GlobeIcon size={14} color="#4CAF50" />
            <Text style={styles.superAdminText}>LOGISTICS</Text>
          </View>
          <Text style={styles.title}>Delivery Zones</Text>
          <Text style={styles.subtitle}>Manage active regions and service areas</Text>
        </View>
        <TouchableOpacity 
          style={styles.addZoneButton} 
          onPress={() => setIsAdding(!isAdding)}
        >
          <Text style={styles.addZoneButtonText}>{isAdding ? "Cancel" : "+ New Zone"}</Text>
        </TouchableOpacity>
      </View>

      {isAdding && (
        <LinearGradient
          colors={["rgba(76, 175, 80, 0.1)", "rgba(30, 30, 45, 0.9)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.newZoneCard}
        >
          <Text style={styles.newZoneTitle}>Create New Zone</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Mumbai South"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={newZoneName}
            onChangeText={setNewZoneName}
            autoFocus
          />
          <TouchableOpacity 
            style={[styles.saveNameButton, { backgroundColor: "rgba(76, 175, 80, 0.2)" }]} 
            onPress={handleCreate}
            disabled={createZone.isPending}
          >
            {createZone.isPending ? <ActivityIndicator size="small" color="#4CAF50" /> : <Text style={[styles.saveNameButtonText, { color: "#4CAF50" }]}>Create Zone</Text>}
          </TouchableOpacity>
        </LinearGradient>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 40 }} />
      ) : zones?.length === 0 ? (
        <View style={styles.emptyState}>
          <ShieldIcon size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>No zones configured.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {zones?.map((zone: any) => (
            <ZoneCard key={zone.id} zone={zone} />
          ))}
        </View>
      )}
      <View style={{ height: 60 }} />
    </Screen>
  );
}

function ZoneCard({ zone }: { zone: any }) {
  const [newPin, setNewPin] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(zone.name);
  const queryClient = useQueryClient();

  const updateZone = useMutation({
    mutationFn: async ({ updatedPinCodes, updatedName }: { updatedPinCodes: string[], updatedName?: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ["adminZones"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    }
  });

  const handleAddPin = () => {
    if (!newPin.trim()) return;
    const currentPins = zone.supported_pincodes || [];
    if (currentPins.includes(newPin.trim())) {
      Alert.alert("Notice", "Pin code already exists.");
      return;
    }
    updateZone.mutate({ updatedPinCodes: [...currentPins, newPin.trim()] });
  };
  
  const handleRemovePin = (pinToRemove: string) => {
    const currentPins = zone.supported_pincodes || [];
    updateZone.mutate({ updatedPinCodes: currentPins.filter((p: string) => p !== pinToRemove) });
  };

  const handleSaveName = () => {
    if (!editName.trim()) return;
    updateZone.mutate({ updatedPinCodes: zone.supported_pincodes || [], updatedName: editName.trim() });
  };

  return (
    <LinearGradient
      colors={["rgba(30, 30, 45, 0.7)", "rgba(15, 15, 26, 0.9)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        {isEditingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setIsEditingName(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveNameButton} onPress={handleSaveName}>
                <Text style={styles.saveNameButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.zoneNameRow}>
            <Text style={styles.zoneName}>{zone.name}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditingName(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isEditingName && (
          <View style={styles.statusBadge}>
            <Text style={styles.badgeText}>{zone.status || "active"}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.pinCodes}>
        {zone.supported_pincodes?.map((pin: string) => (
          <View key={pin} style={styles.pinBadgeContainer}>
            <Text style={styles.pinBadge}>{pin}</Text>
            <TouchableOpacity style={styles.removePinBtn} onPress={() => handleRemovePin(pin)}>
              <Text style={styles.removePinText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {(!zone.supported_pincodes || zone.supported_pincodes.length === 0) && (
          <Text style={styles.mutedText}>No pincodes assigned yet.</Text>
        )}
      </View>

      <View style={styles.addPinContainer}>
        <TextInput
          style={styles.input}
          placeholder="New Pin Code"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={newPin}
          onChangeText={setNewPin}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleAddPin}
          disabled={updateZone.isPending}
        >
          {updateZone.isPending ? (
             <ActivityIndicator size="small" color="#6C63FF" />
          ) : (
             <Text style={styles.addButtonText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerContent: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  superAdminText: {
    color: "#4CAF50",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  addZoneButton: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  addZoneButtonText: {
    color: "#4CAF50",
    fontWeight: "800",
    fontSize: 13,
  },
  newZoneCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
    marginBottom: 24,
  },
  newZoneTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    gap: 16
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
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
    gap: 12,
  },
  zoneName: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
  },
  editButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  editButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "700",
  },
  editNameRow: {
    flex: 1,
    gap: 12,
  },
  nameInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    color: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
  },
  cancelText: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
    fontSize: 14,
  },
  saveNameButton: {
    backgroundColor: "rgba(108, 99, 255, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.3)",
  },
  saveNameButtonText: {
    color: "#6C63FF",
    fontWeight: "800",
    fontSize: 13,
  },
  mutedText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontStyle: "italic",
  },
  statusBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  badgeText: {
    color: "#4CAF50",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pinCodes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  pinBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    overflow: "hidden",
  },
  pinBadge: {
    color: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  removePinBtn: {
    backgroundColor: "rgba(249, 60, 101, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  removePinText: {
    color: "#F93C65",
    fontWeight: "900",
    fontSize: 14,
    lineHeight: 14,
  },
  addPinContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    color: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#6C63FF",
    fontWeight: "900",
    fontSize: 14,
  }
});
