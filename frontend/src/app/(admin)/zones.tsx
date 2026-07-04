/**
 * OmniQ mobile app - admin zones screen.
 * Author: OmniQ Team
 */
import { StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/shared/Screen";
import { BarIcon } from "@/components/ui/BarIcon";
import { UsersIcon } from "@/components/ui/UsersIcon";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { GlobeIcon } from "@/components/ui/GlobeIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { colors } from "@/constants/colors";
import { apiClient } from "@/lib/apiClient";

export default function AdminZonesScreen() {
  const { data: zones, isLoading } = useQuery({
    queryKey: ["adminZones"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/zones");
      return res.data.data;
    },
  });

  return (
    <>
      <Screen scroll>
        <Text style={styles.title}>Delivery Zones</Text>
        <Text style={styles.subtitle}>Active regions on OmniQ</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : zones?.length === 0 ? (
          <Text style={{ color: colors.textMuted, marginVertical: 20 }}>No zones configured.</Text>
        ) : (
          <View style={styles.list}>
            {zones?.map((zone: any) => (
              <ZoneCard key={zone.id} zone={zone} />
            ))}
          </View>
        )}
      </Screen>
      
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 20
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
    alignItems: "center",
    marginBottom: 8
  },
  zoneName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  mutedText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(46, 204, 113, 0.2)"
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  pinCodes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12
  },
  pinBadge: {
    backgroundColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600"
  },
  addPinContainer: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
    alignItems: "center"
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14
  }
});

function ZoneCard({ zone }: { zone: any }) {
  const [newPin, setNewPin] = useState("");
  const queryClient = useQueryClient();

  const updateZone = useMutation({
    mutationFn: async (updatedPinCodes: string[]) => {
      // API expects name, centreLat, centreLng, radiusKm, pinCodes
      await apiClient.post("/admin/zones", {
        name: zone.name,
        centreLat: zone.lat || zone.center_lat || 0,
        centreLng: zone.lng || zone.center_lng || 0,
        radiusKm: zone.radius_km || 10,
        pinCodes: updatedPinCodes
      });
    },
    onSuccess: () => {
      setNewPin("");
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
    updateZone.mutate([...currentPins, newPin.trim()]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.zoneName}>{zone.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{zone.status}</Text>
        </View>
      </View>
      
      <View style={styles.pinCodes}>
        {zone.supported_pincodes?.map((pin: string) => (
          <Text key={pin} style={styles.pinBadge}>{pin}</Text>
        ))}
      </View>

      <View style={styles.addPinContainer}>
        <TextInput
          style={styles.input}
          placeholder="New Pin Code"
          placeholderTextColor={colors.textMuted}
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
             <ActivityIndicator size="small" color="#fff" />
          ) : (
             <Text style={styles.addButtonText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
