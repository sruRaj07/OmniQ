/**
 * OmniQ mobile app - seller product form.
 * Author: OmniQ Team
 */
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Modal } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { CategorySvgIcon } from "@/components/ui/CategorySvgIcon";
import {
  compressProductImage,
  formatBytes,
  savingsPercent,
} from "@/utils/imageCompressor";

export type ProductFormProps = {
  initialData?: any;
  onCloseEdit?: () => void;
};

/**
 * One slot in the image strip. `originalSize`/`compressedSize` are 0 for images
 * that came back from the server (already compressed, nothing to report).
 */
type PickedImage = {
  uri: string;
  blurhash: string | null;
  originalSize: number;
  compressedSize: number;
};

function existingImage(uri: string): PickedImage {
  return { uri, blurhash: null, originalSize: 0, compressedSize: 0 };
}

export function ProductForm({ initialData, onCloseEdit }: ProductFormProps) {
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const isEditing = !!initialData;

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>(["grocery", "kitchen"]);

  useEffect(() => {
    // Dynamically fetch tag pills from the backend so adding new categories in future requires zero frontend app changes
    const fetchTags = async () => {
      try {
        const res = await apiClient.get("/products/tags");
        if (res.data?.success && Array.isArray(res.data?.data?.tags) && res.data.data.tags.length > 0) {
          setAvailableTags(res.data.data.tags);
        }
      } catch (err) {
        console.log("Using fallback tags:", err);
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setPrice(initialData.price?.toString() || "");
      setComparePrice(initialData.compare_price?.toString() || "");
      setStock(initialData.stock?.toString() || "");
      setCategory(initialData.category || "");
      setDescription(initialData.description || "");
      setImages((initialData.images || []).map(existingImage));
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
      // Left at source quality — imageCompressor does the resize and encode, so
      // compressing twice would only add artefacts.
      quality: 1
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    const picked = result.assets[0];
    setIsCompressing(true);
    try {
      const compressed = await compressProductImage(picked.uri);
      setImages(current => [
        ...current,
        {
          uri: compressed.uri,
          blurhash: compressed.blurhash,
          // fileSize from the picker is the seller's original; ours is the result.
          originalSize: picked.fileSize ?? 0,
          compressedSize: compressed.fileSize
        }
      ]);
    } catch (err) {
      // Compression is an optimisation, never a gate on listing a product.
      console.log("Compression failed, uploading original:", err);
      setImages(current => [...current, existingImage(picked.uri)]);
    } finally {
      setIsCompressing(false);
    }
  };
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };
  const normalizedCat = category.trim().toLowerCase();
  const hasActiveTag = availableTags.includes(normalizedCat);

  const handleSelectTag = (tag: string) => {
    setCategory(tag.toLowerCase());
  };

  const handleRemoveTag = () => {
    setCategory("");
  };

  const handleSave = async () => {
    const finalCategory = category.trim().toLowerCase();
    const finalStock = stock.trim() ? stock.trim() : "10"; // Stock optional, defaults to 10 if empty

    if (!title.trim() || !price.trim() || !comparePrice.trim() || !finalCategory || !description.trim()) {
      Alert.alert("Required Fields Missing", "Please fill in all required fields: Product Title, Selling Price, Market Price (M.R.P.), Category, and Description.");
      return;
    }
    if (images.length === 0) {
      Alert.alert("Product Image Required", "Please upload at least 1 product image before listing.");
      return;
    }
    if (description.length < 10) {
      Alert.alert("Validation Error", "Description must be at least 10 characters long.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("price", price.trim());
      formData.append("compare_price", comparePrice.trim());
      formData.append("stock", finalStock);
      formData.append("category", finalCategory);
      formData.append("description", description.trim());

      // SKU is required by the validator in the backend
      formData.append("sku", `SKU-${Date.now().toString().slice(-6)}`);

      // Process images sequentially because of await
      for (let index = 0; index < images.length; index++) {
        const uri = images[index].uri;
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowSuccessModal(true);
    } catch (error: any) {
      console.log("API Error caught:", error?.response?.data || error.message);
      const errorMessage = error?.response?.data?.error?.message || error?.message || "Failed to save product.";
      Alert.alert("API Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  // "Compressed from 3.2MB to 180KB (94% saved)" across every freshly picked
  // image. Images loaded from the server carry no original size, so they are
  // skipped rather than dragging the percentage down.
  const compressionSummary = React.useMemo(() => {
    const measured = images.filter(image => image.originalSize > 0 && image.compressedSize > 0);
    if (measured.length === 0) return null;

    const before = measured.reduce((sum, image) => sum + image.originalSize, 0);
    const after = measured.reduce((sum, image) => sum + image.compressedSize, 0);
    return `Compressed from ${formatBytes(before)} to ${formatBytes(after)} (${savingsPercent(before, after)}% saved)`;
  }, [images]);

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
      <Input placeholder="Stock (Optional - Defaults to 10)" keyboardType="numeric" value={stock} onChangeText={setStock} />
      
      <View style={styles.categoryContainer}>
        <Input 
          placeholder="Category (e.g. grocery, kitchen)" 
          value={category} 
          onChangeText={(text) => setCategory(text.toLowerCase())} 
          autoCapitalize="none"
        />
        
        {/* Facebook-Style Category Tagging Section */}
        <View style={styles.tagSection}>
          {hasActiveTag ? (
            <View>
              <Text style={styles.tagHelperText}>Selected Category Tag (Only 1 category allowed per item):</Text>
              <View style={styles.activeTagRow}>
                <TouchableOpacity style={styles.selectedTagPill} onPress={handleRemoveTag} activeOpacity={0.8}>
                  <CategorySvgIcon category={normalizedCat} size={16} showBackground={false} style={{ marginRight: 6 }} />
                  <Text style={styles.selectedTagText}>{normalizedCat}</Text>
                  <View style={styles.tagCloseBtn}>
                    <Text style={styles.tagCloseText}>✕</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.tagHelperText}>Suggested Category Tags (Click to tag):</Text>
              <View style={styles.tagsGrid}>
                {availableTags.map((tag) => (
                  <TouchableOpacity key={tag} style={styles.suggestedTagPill} onPress={() => handleSelectTag(tag)} activeOpacity={0.7}>
                    <CategorySvgIcon category={tag} size={16} showBackground={false} style={{ marginRight: 6 }} />
                    <Text style={styles.suggestedTagText}>{tag}</Text>
                    <Text style={styles.tagAddText}> +</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
      <View>
        <Input placeholder="Description" multiline style={styles.textArea} value={description} onChangeText={setDescription} maxLength={500} />
        <Text style={styles.charCounter}>{description.length}/500 characters</Text>
      </View>
      
      <View style={styles.imageSection}>
        <Text style={styles.imageTitle}>Product Images ({images.length}/5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
          {images.map((image, index) => <TouchableOpacity key={index} onPress={() => removeImage(index)} style={styles.imageBoxSelected}>
              <Image
                source={image.uri}
                placeholder={image.blurhash ?? undefined}
                style={styles.imagePreview}
                contentFit="cover"
                transition={150}
              />
              <View style={styles.removeOverlay}>
                <Text style={styles.removeText}>✕</Text>
              </View>
            </TouchableOpacity>)}
          {isCompressing && <View style={[styles.imageBox, styles.imageBoxBusy]}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.compressingText}>Optimising…</Text>
            </View>}
          {images.length < 5 && !isCompressing && <TouchableOpacity onPress={handlePickImage} style={styles.imageBox}>
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>}
        </ScrollView>
        {compressionSummary && <Text style={styles.compressionStats}>{compressionSummary}</Text>}
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
  imageBoxBusy: {
    borderStyle: "solid",
    gap: 6
  },
  compressingText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600"
  },
  compressionStats: {
    color: colors.success || "#2ecc71",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    marginLeft: 4
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
  },
  categoryContainer: {
    gap: 8
  },
  tagSection: {
    marginTop: -2,
    marginBottom: 4,
    paddingHorizontal: 4
  },
  tagHelperText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  suggestedTagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border2
  },
  suggestedTagText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 14
  },
  tagAddText: {
    color: colors.accent,
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 4
  },
  activeTagRow: {
    flexDirection: "row"
  },
  selectedTagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(79, 70, 229, 0.15)", // Brand Indigo tint
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#4F46E5"
  },
  selectedTagText: {
    color: "#4F46E5",
    fontWeight: "800",
    fontSize: 14,
    marginRight: 8
  },
  tagCloseBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center"
  },
  tagCloseText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900"
  }
});