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
      // Fetching from product service since admin proxy for GET wasn't explicitly needed yet,
      // but this is the public endpoint we created.
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
    <Screen bottomNavItems={[]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Manage Advertisements</Text>
        <View style={{ width: 60 }} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload New Ad</Text>
        <Input placeholder="Advertisement Title" value={title} onChangeText={setTitle} />
        <Input placeholder="Target Product ID (e.g. omq-spices-01)" value={targetUrl} onChangeText={setTargetUrl} />
        
        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePickerText}>Tap to select 16:9 Banner Image</Text>
          )}
        </TouchableOpacity>
        
        <Button onPress={handleUpload} disabled={isUploading} style={styles.uploadBtn}>
          {isUploading ? <ActivityIndicator color="#fff" /> : "Upload Advertisement"}
        </Button>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Advertisements</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : ads?.length === 0 ? (
          <Text style={styles.emptyText}>No active advertisements found.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adsList}>
            {ads?.map((ad) => (
              <View key={ad.id} style={styles.adCard}>
                <Image source={{ uri: ad.image_url }} style={styles.adImage} />
                <View style={styles.adContent}>
                  <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                  <Text style={styles.adLink} numberOfLines={1}>{ad.target_url || "No link"}</Text>
                  <Button variant="outline" onPress={() => handleDelete(ad.id)} style={styles.deleteBtn}>
                    Delete
                  </Button>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingTop: 10,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "700",
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  section: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  imagePicker: {
    height: 140,
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
    overflow: "hidden"
  },
  imagePickerText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  uploadBtn: {
    marginTop: 8,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    padding: 20,
  },
  adsList: {
    gap: 16,
    paddingRight: 20,
  },
  adCard: {
    width: 280,
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  adImage: {
    width: "100%",
    height: 140,
  },
  adContent: {
    padding: 12,
  },
  adTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  adLink: {
    color: colors.primary,
    fontSize: 12,
    marginBottom: 12,
  },
  deleteBtn: {
    height: 36,
    borderColor: colors.danger,
  }
});
