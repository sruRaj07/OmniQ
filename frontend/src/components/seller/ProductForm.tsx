/**
 * OmniQ mobile app - seller product form.
 * Author: OmniQ Team
 */
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform, Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppTheme } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
export type ProductFormProps = {
  initialData?: any;
  onCloseEdit?: () => void;
};

export function ProductForm({ initialData, onCloseEdit }: ProductFormProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const isEditing = !!initialData;

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setPrice(initialData.price?.toString() || "");
      setComparePrice(initialData.compare_price?.toString() || "");
      setStock(initialData.stock?.toString() || "");
      setCategory(initialData.category || "");
      setDescription(initialData.description || "");
      setImages(initialData.images || []);
    } else {
      setTitle("");
      setPrice("");
      setComparePrice("");
      setStock("");
      setCategory("");
      setDescription("");
      setImages([]);
    }
  }, [initialData]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const queryClient = useQueryClient();
  const handlePickImage = async () => {
    if (images.length >= 5) {
      Alert.alert("Limit Reached", "You can only upload up to 5 images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.canceled && result.assets[0].uri) {
      setImages([...images, result.assets[0].uri]);
    }
  };
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };
  const handleSave = async () => {
    if (!title || !price || !category || !stock || !description) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
    if (description.length < 10) {
      Alert.alert("Validation Error", "Description must be at least 10 characters long.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("price", price);
      if (comparePrice) formData.append("compare_price", comparePrice);
      formData.append("stock", stock);
      formData.append("category", category);
      if (description) formData.append("description", description);

      // SKU is required by the validator in the backend
      formData.append("sku", `SKU-${Date.now().toString().slice(-6)}`);

      // Process images sequentially because of await
      for (let index = 0; index < images.length; index++) {
        const uri = images[index];
        if (uri.startsWith("http")) {
          // It's an already uploaded image, just pass the URL back as a separate field
          formData.append("existing_images", uri);
          continue;
        }

        const filename = uri.split("/").pop() || `image-${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        if (Platform.OS === 'web') {
          const res = await fetch(uri);
          const blob = await res.blob();
          formData.append("images", blob, filename);
        } else {
          formData.append("images", {
            uri,
            name: filename,
            type
          } as any);
        }
      }

      if (isEditing) {
        await apiClient.put(`/products/${initialData.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await apiClient.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
      setShowSuccessModal(true);
    } catch (error: any) {
      console.log("API Error caught:", error?.response?.data || error.message);
      const errorMessage = error?.response?.data?.error?.message || error?.message || "Failed to save product.";
      Alert.alert("API Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    if (onCloseEdit) {
      onCloseEdit();
    }
  };
  return <View style={styles.stack}>
      <Input placeholder="Product title" value={title} onChangeText={setTitle} />
      <Input placeholder="Selling Price (Your Price)" keyboardType="numeric" value={price} onChangeText={setPrice} />
      <Input placeholder="Market Price (M.R.P.)" keyboardType="numeric" value={comparePrice} onChangeText={setComparePrice} />
      <Input placeholder="Stock" keyboardType="numeric" value={stock} onChangeText={setStock} />
      <Input placeholder="Category" value={category} onChangeText={setCategory} />
      <View>
        <Input placeholder="Description" multiline style={styles.textArea} value={description} onChangeText={setDescription} maxLength={500} />
        <Text style={styles.charCounter}>{description.length}/500 characters</Text>
      </View>
      
      <View style={styles.imageSection}>
        <Text style={styles.imageTitle}>Product Images ({images.length}/5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
          {images.map((uri, index) => <TouchableOpacity key={index} onPress={() => removeImage(index)} style={styles.imageBoxSelected}>
              <Image source={{
            uri
          }} style={styles.imagePreview} />
              <View style={styles.removeOverlay}>
                <Text style={styles.removeText}>✕</Text>
              </View>
            </TouchableOpacity>)}
          {images.length < 5 && <TouchableOpacity onPress={handlePickImage} style={styles.imageBox}>
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>}
        </ScrollView>
      </View>

      {isEditing && (
        <Button onPress={onCloseEdit} variant="secondary" style={styles.cancelBtn}>
          Cancel Edit
        </Button>
      )}
      <Button onPress={handleSave} style={styles.saveBtn} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : (isEditing ? "Update Product" : "List Product")}
      </Button>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalText}>{isEditing ? "Product successfully updated and sent for admin approval!" : "Successfully listing done!"}</Text>
            <Button onPress={handleCloseSuccess} style={{
            width: "100%",
            marginTop: 10
          }}>
              Done
            </Button>
          </View>
        </View>
      </Modal>
    </View>;
}
const getStyles = (colors: any) => StyleSheet.create({
  stack: {
    gap: 14
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 18,
    paddingBottom: 18
  },
  charCounter: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
    marginRight: 4
  },
  imageSection: {
    marginTop: 4,
    marginBottom: 8
  },
  imageTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 4
  },
  imageScroll: {
    gap: 12
  },
  imageBox: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: colors.border2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center"
  },
  imageBoxSelected: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border2
  },
  imagePreview: {
    width: "100%",
    height: "100%"
  },
  removeOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  removeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900"
  },
  plusIcon: {
    color: colors.textMuted,
    fontSize: 28,
    fontWeight: "300",
    marginTop: -4
  },
  saveBtn: {
    marginTop: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 30,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(46, 204, 113, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  successIcon: {
    color: "#2ecc71",
    fontSize: 28,
    fontWeight: "900"
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8
  },
  modalText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center"
  },
  cancelBtn: {
    marginTop: 8,
    marginBottom: 4
  }
});