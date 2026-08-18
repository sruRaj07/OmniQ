/**
 * OmniQ mobile app - seller product form.
 *
 * Fields are grouped and labelled rather than relying on placeholders, which vanish the
 * moment a seller starts typing and leave them guessing which box held the M.R.P. Saving no
 * longer raises its own modal — the parent screen gets an `onSaved` callback and shows a toast.
 *
 * Author: OmniQ Team
 */
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Pressable } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useThemeColors } from "@/store/useThemeStore";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { CategorySvgIcon } from "@/components/ui/CategorySvgIcon";
import { RADIUS, SPACE, withAlpha } from "@/constants/sellerTheme";
import { CameraIcon, CheckIcon, InfoIcon, XIcon } from "@/components/ui/SellerIcons";
import {
  compressProductImage,
  formatBytes,
  savingsPercent,
} from "@/utils/imageCompressor";

export type ProductFormProps = {
  initialData?: any;
  onCloseEdit?: () => void;
  /** Fired after a successful save so the host screen can close the sheet and confirm. */
  onSaved?: (mode: "created" | "updated") => void;
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

/** Label + optional hint above a field. Keeps the six field groups visually identical. */
function Field({
  label,
  hint,
  required,
  children,
  colors,
}: React.PropsWithChildren<{ label: string; hint?: string; required?: boolean; colors: any }>) {
  const styles = getStyles(colors);
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required ? <Text style={styles.requiredMark}>*</Text> : <Text style={styles.optionalMark}>Optional</Text>}
      </View>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function ProductForm({ initialData, onCloseEdit, onSaved }: ProductFormProps) {
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
      onSaved?.(isEditing ? "updated" : "created");
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

  // The buyer sees the saving as a percentage badge, so show the seller the same number
  // while they are still choosing the price rather than after the listing goes live.
  const discountPreview = React.useMemo(() => {
    const sell = Number(price);
    const mrp = Number(comparePrice);
    if (!Number.isFinite(sell) || !Number.isFinite(mrp) || sell <= 0 || mrp <= 0) return null;
    if (mrp <= sell) return { invalid: true, percent: 0 };
    return { invalid: false, percent: Math.round(((mrp - sell) / mrp) * 100) };
  }, [comparePrice, price]);

  return (
    <View style={styles.stack}>
      <Field label="Product title" required colors={colors}>
        <Input
          placeholder="e.g. Aashirvaad Atta 5kg"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />
      </Field>

      <View style={styles.priceRow}>
        <View style={styles.priceCol}>
          <Field label="Selling price" required colors={colors}>
            <Input placeholder="₹0" keyboardType="numeric" value={price} onChangeText={setPrice} />
          </Field>
        </View>
        <View style={styles.priceCol}>
          <Field label="M.R.P." required colors={colors}>
            <Input placeholder="₹0" keyboardType="numeric" value={comparePrice} onChangeText={setComparePrice} />
          </Field>
        </View>
      </View>

      {discountPreview ? (
        <View
          style={[
            styles.discountBanner,
            {
              backgroundColor: withAlpha(discountPreview.invalid ? colors.warning : colors.success, 0.1),
              borderColor: withAlpha(discountPreview.invalid ? colors.warning : colors.success, 0.3),
            },
          ]}
        >
          <InfoIcon size={15} color={discountPreview.invalid ? colors.warning : colors.success} strokeWidth={2.2} />
          <Text style={[styles.discountText, { color: discountPreview.invalid ? colors.warning : colors.success }]}>
            {discountPreview.invalid
              ? "M.R.P. should be higher than your selling price"
              : `Buyers will see a ${discountPreview.percent}% off badge`}
          </Text>
        </View>
      ) : null}

      <Field label="Stock" hint="Left blank, we start you at 10 units." colors={colors}>
        <Input placeholder="10" keyboardType="numeric" value={stock} onChangeText={setStock} />
      </Field>

      <Field label="Category" required colors={colors}>
        <Input
          placeholder="e.g. grocery, kitchen"
          value={category}
          onChangeText={(text) => setCategory(text.toLowerCase())}
          autoCapitalize="none"
        />
        <View style={styles.tagSection}>
          {hasActiveTag ? (
            <View>
              <Text style={styles.tagHelperText}>Tagged category — one per listing</Text>
              <View style={styles.activeTagRow}>
                <TouchableOpacity style={styles.selectedTagPill} onPress={handleRemoveTag} activeOpacity={0.8}>
                  <CategorySvgIcon category={normalizedCat} size={16} showBackground={false} style={{ marginRight: 6 }} />
                  <Text style={styles.selectedTagText}>{normalizedCat}</Text>
                  <View style={styles.tagCloseBtn}>
                    <XIcon size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.tagHelperText}>Tap to tag</Text>
              <View style={styles.tagsGrid}>
                {availableTags.map((tag) => (
                  <TouchableOpacity key={tag} style={styles.suggestedTagPill} onPress={() => handleSelectTag(tag)} activeOpacity={0.7}>
                    <CategorySvgIcon category={tag} size={16} showBackground={false} style={{ marginRight: 6 }} />
                    <Text style={styles.suggestedTagText}>{tag}</Text>
                    <Text style={styles.tagAddText}>+</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Field>

      <Field label="Description" required colors={colors}>
        <Input
          placeholder="Weight, pack size, brand, what makes it worth buying…"
          multiline
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          maxLength={500}
        />
        <View style={styles.counterRow}>
          <Text style={[styles.fieldHint, description.length > 0 && description.length < 10 && { color: colors.warning }]}>
            {description.length > 0 && description.length < 10 ? "At least 10 characters" : "Minimum 10 characters"}
          </Text>
          <Text style={styles.charCounter}>{description.length}/500</Text>
        </View>
      </Field>

      <View style={styles.imageSection}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>Product images</Text>
          <Text style={styles.imageCount}>{images.length}/5</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageBoxSelected}>
              <Image
                source={image.uri}
                placeholder={image.blurhash ?? undefined}
                style={styles.imagePreview}
                contentFit="cover"
                transition={150}
              />
              {index === 0 ? (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>Cover</Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => removeImage(index)}
                hitSlop={6}
                accessibilityLabel={`Remove image ${index + 1}`}
                style={styles.removeOverlay}
              >
                <XIcon size={12} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            </View>
          ))}
          {isCompressing && (
            <View style={[styles.imageBox, styles.imageBoxBusy]}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.compressingText}>Optimising…</Text>
            </View>
          )}
          {images.length < 5 && !isCompressing && (
            <TouchableOpacity onPress={handlePickImage} style={styles.imageBox} activeOpacity={0.7}>
              <CameraIcon size={20} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.addImageText}>Add</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        {compressionSummary ? (
          <View style={styles.compressionRow}>
            <CheckIcon size={13} color={colors.success} strokeWidth={2.6} />
            <Text style={styles.compressionStats}>{compressionSummary}</Text>
          </View>
        ) : (
          <Text style={styles.fieldHint}>The first image is what buyers see in search. Square photos work best.</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Button onPress={handleSave} disabled={isLoading} loading={isLoading}>
          {isEditing ? "Update product" : "List product"}
        </Button>
        {isEditing && (
          <Button onPress={onCloseEdit} variant="secondary" disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Text style={styles.approvalNote}>
          {isEditing
            ? "Edited listings go back through admin approval before buyers see them."
            : "New listings are reviewed by an admin, usually within 24 hours."}
        </Text>
      </View>
    </View>
  );
}
const getStyles = (colors: any) => StyleSheet.create({
  stack: {
    gap: SPACE.lg
  },
  field: {
    gap: SPACE.sm
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginLeft: 2
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.1
  },
  requiredMark: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900"
  },
  optionalMark: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600"
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "500",
    marginLeft: 2
  },
  priceRow: {
    flexDirection: "row",
    gap: SPACE.md
  },
  priceCol: {
    flex: 1,
    minWidth: 0
  },
  discountBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: -SPACE.sm
  },
  discountText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700"
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 18,
    paddingBottom: 18
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  charCounter: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginRight: 2
  },
  imageSection: {
    gap: SPACE.md
  },
  imageCount: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "700"
  },
  imageScroll: {
    gap: SPACE.md,
    paddingVertical: 2
  },
  imageBox: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: colors.border2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  addImageText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
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
  compressionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 2
  },
  compressionStats: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "700"
  },
  imageBoxSelected: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border2
  },
  imagePreview: {
    width: "100%",
    height: "100%"
  },
  coverBadge: {
    position: "absolute",
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(20,19,17,0.62)",
    paddingVertical: 3,
    alignItems: "center"
  },
  coverText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  removeOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(20,19,17,0.7)",
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  actions: {
    gap: SPACE.md,
    marginTop: SPACE.xs
  },
  approvalNote: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 16
  },
  tagSection: {
    marginTop: SPACE.xs,
    paddingHorizontal: 2
  },
  tagHelperText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: SPACE.sm
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm
  },
  suggestedTagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: SPACE.md,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colors.border2
  },
  suggestedTagText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 13.5
  },
  tagAddText: {
    color: colors.accent,
    fontWeight: "900",
    fontSize: 15,
    marginLeft: 5
  },
  activeTagRow: {
    flexDirection: "row"
  },
  selectedTagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: withAlpha(colors.accent, 0.13),
    paddingLeft: SPACE.md,
    paddingRight: SPACE.sm,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: colors.accent
  },
  selectedTagText: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 13.5,
    marginRight: SPACE.sm
  },
  tagCloseBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  }
});
