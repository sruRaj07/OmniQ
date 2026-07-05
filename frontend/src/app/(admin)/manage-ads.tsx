import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from "react-native";
import { Screen } from "@/components/shared/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiClient } from "@/lib/apiClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { ShieldIcon } from "@/components/ui/ShieldIcon";

type Advertisement = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  is_active: boolean;
};

export default function ManageAdsScreen() {
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: ads, isLoading } = useQuery({
    queryKey: ["admin-advertisements"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Advertisement[] }>("/products/advertisements");
      return res.data.data;
    },
  });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!title || !imageUri) {
      Alert.alert("Error", "Title and Image are required.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("target_url", targetUrl);

      const filename = imageUri.split("/").pop() || `ad-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      if (Platform.OS === 'web') {
        const res = await fetch(imageUri);
        const blob = await res.blob();
        formData.append("image", blob, filename);
      } else {
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      await apiClient.post("/admin/advertisements", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Success", "Advertisement uploaded successfully!");
      setTitle("");
      setTargetUrl("");
      setImageUri(null);
      queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || "Upload failed.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Confirm", "Delete this advertisement?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/advertisements/${id}`);
            queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
          } catch (error) {
            Alert.alert("Error", "Failed to delete advertisement.");
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll bottomNavItems={[]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Overview</Text>
        </TouchableOpacity>
        
        <View style={styles.badgeRow}>
          <FlagIcon size={14} color="#F93C65" />
          <Text style={styles.superAdminText}>MARKETING</Text>
        </View>
        <Text style={styles.title}>Advertisements</Text>
        <Text style={styles.subtitle}>Manage platform-wide banner campaigns</Text>
      </View>
      
      <LinearGradient
        colors={["rgba(30, 30, 45, 0.7)", "rgba(15, 15, 26, 0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.uploadSection}
      >
        <Text style={styles.sectionTitle}>Launch New Campaign</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>CAMPAIGN TITLE</Text>
          <Input 
            placeholder="e.g. Summer Sale 2026" 
            value={title} 
            onChangeText={setTitle}
            style={styles.premiumInput} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>TARGET URL / PRODUCT ID (Optional)</Text>
          <Input 
            placeholder="e.g. omq-spices-01" 
            value={targetUrl} 
            onChangeText={setTargetUrl}
            style={styles.premiumInput} 
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>BANNER ARTWORK (16:9)</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.8}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePickerIcon}>+</Text>
                <Text style={styles.imagePickerText}>Tap to select image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]} 
          onPress={handleUpload} 
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.uploadBtnText}>Upload Advertisement</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.activeSection}>
        <View style={styles.activeHeader}>
          <Text style={styles.activeTitle}>Active Campaigns</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Live</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#F93C65" style={{ marginTop: 40 }} />
        ) : ads?.length === 0 ? (
          <View style={styles.emptyState}>
            <ShieldIcon size={48} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyText}>No active advertisements.</Text>
          </View>
        ) : (
          <View style={styles.adsList}>
            {ads?.map((ad) => (
              <View key={ad.id} style={styles.adCard}>
                <Image source={{ uri: ad.image_url }} style={styles.adImage} />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  style={styles.adGradient}
                >
                  <View style={styles.adContent}>
                    <View style={styles.adTextContainer}>
                      <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                      <Text style={styles.adLink} numberOfLines={1}>
                        Target: {ad.target_url || "None"}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteBtn} 
                      onPress={() => handleDelete(ad.id)}
                    >
                      <Text style={styles.deleteBtnText}>Stop</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={{ height: 60 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backText: {
    color: "#6C63FF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  superAdminText: {
    color: "#F93C65",
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
  uploadSection: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  premiumInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    color: "#FFF",
    borderRadius: 12,
  },
  imagePicker: {
    height: 160,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    overflow: "hidden"
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerIcon: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 32,
    fontWeight: "300",
    marginBottom: 8,
  },
  imagePickerText: {
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    fontSize: 14,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  uploadBtn: {
    backgroundColor: "rgba(249, 60, 101, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(249, 60, 101, 0.3)",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: "#F93C65",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  activeSection: {
    marginBottom: 20,
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  activeTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
  },
  activeBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  activeBadgeText: {
    color: "#4CAF50",
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  adsList: {
    gap: 20,
  },
  adCard: {
    width: "100%",
    height: 180,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  adImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  adGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  adContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  adTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  adTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  adLink: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "rgba(249, 60, 101, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(249, 60, 101, 0.5)",
  },
  deleteBtnText: {
    color: "#F93C65",
    fontWeight: "900",
    fontSize: 13,
  }
});
