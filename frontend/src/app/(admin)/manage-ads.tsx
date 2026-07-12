import React, { useState, useMemo } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from "react-native";
import { Screen } from "@/components/shared/Screen";
import { Input } from "@/components/ui/Input";
import { useAppTheme } from "@/store/useThemeStore";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiClient } from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { LinearGradient } from "expo-linear-gradient";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { AdsIcon } from "@/components/ui/AdsIcon";
import { ArrowLeftIcon } from "@/components/ui/ArrowLeftIcon";
import { PauseIcon } from "@/components/ui/PauseIcon";
import { PlayIcon } from "@/components/ui/PlayIcon";
import { TrashIcon } from "@/components/ui/TrashIcon";
import { EditIcon } from "@/components/ui/EditIcon";

type Advertisement = {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  is_active: boolean;
};

export default function ManageAdsScreen() {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'ads' | 'offers'>('ads');

  // Ad / Offer form state
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTargetUrl, setEditTargetUrl] = useState("");
  const [editImageUri, setEditImageUri] = useState<string | null>(null);

  const { data: allCampaigns, isLoading } = useQuery({
    queryKey: ["admin-advertisements"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Advertisement[] }>("/products/advertisements");
      return res.data.data;
    }
  }, queryClient);

  // Filter ads vs offers based on title prefix
  const ads = useMemo(() => allCampaigns?.filter(c => !c.title.startsWith("[OFFER]")) || [], [allCampaigns]);
  const offers = useMemo(() => allCampaigns?.filter(c => c.title.startsWith("[OFFER]")) || [], [allCampaigns]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8
    });
    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleEditPickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8
    });
    if (!result.canceled && result.assets[0].uri) {
      setEditImageUri(result.assets[0].uri);
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
      // Prefix title with [OFFER] if in offers tab
      const finalTitle = activeTab === 'offers' ? `[OFFER] ${title}` : title;
      formData.append("title", finalTitle);
      formData.append("target_url", targetUrl);
      const filename = imageUri.split("/").pop() || `campaign-${Date.now()}.jpg`;
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
          type
        } as any);
      }
      
      await apiClient.post("/admin/advertisements", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      Alert.alert("Success", `${activeTab === 'offers' ? 'Offer' : 'Advertisement'} uploaded successfully!`);
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
    Alert.alert("Confirm", "Delete this campaign permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/advertisements/${id}`);
            queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
          } catch (error) {
            Alert.alert("Error", "Failed to delete campaign.");
          }
        }
      }
    ]);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/admin/advertisements/${id}`, { is_active: !currentStatus });
      queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
    } catch (error) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const handleSaveEdit = async (id: string, type: 'ads' | 'offers') => {
    try {
      const finalTitle = type === 'offers' ? `[OFFER] ${editTitle}` : editTitle;
      const formData = new FormData();
      formData.append("title", finalTitle);
      formData.append("target_url", editTargetUrl);
      
      if (editImageUri) {
        const filename = editImageUri.split("/").pop() || `campaign-${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : `image/jpeg`;
        
        if (Platform.OS === 'web') {
          const res = await fetch(editImageUri);
          const blob = await res.blob();
          formData.append("image", blob, filename);
        } else {
          formData.append("image", {
            uri: editImageUri,
            name: filename,
            type: mimeType
          } as any);
        }
      }

      await apiClient.patch(`/admin/advertisements/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setEditingId(null);
      setEditImageUri(null);
      queryClient.invalidateQueries({ queryKey: ["admin-advertisements"] });
    } catch (error) {
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  const renderUploadForm = (type: 'ads' | 'offers') => (
    <View style={styles.uploadSection}>
      <Text style={styles.sectionTitle}>
        {type === 'ads' ? 'Launch New Advertisement' : 'Create Promotional Offer'}
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{type === 'ads' ? 'CAMPAIGN TITLE' : 'OFFER TITLE'}</Text>
        <Input 
          placeholder={type === 'ads' ? "e.g. Summer Sale 2026" : "e.g. Flash Sale 60% Off"} 
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
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
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
          <Text style={styles.uploadBtnText}>Upload {type === 'ads' ? 'Advertisement' : 'Offer'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderList = (items: Advertisement[], type: 'ads' | 'offers') => (
    <View style={styles.activeSection}>
      <View style={styles.activeHeader}>
        <Text style={styles.activeTitle}>Active {type === 'ads' ? 'Campaigns' : 'Offers'}</Text>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Live</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <ShieldIcon size={48} color={colors.border} />
          <Text style={styles.emptyText}>No active {type === 'ads' ? 'advertisements' : 'offers'}.</Text>
        </View>
      ) : (
        <View style={styles.adsList}>
          {items.map(item => (
            <View key={item.id} style={styles.adRowContainer}>
              {editingId === item.id ? (
                <View style={styles.editExpandedContainer}>
                  <Text style={styles.editSectionTitle}>Edit Campaign</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>TITLE</Text>
                    <Input value={editTitle} onChangeText={setEditTitle} style={styles.premiumInput} placeholder="Title" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>TARGET URL</Text>
                    <Input value={editTargetUrl} onChangeText={setEditTargetUrl} style={styles.premiumInput} placeholder="Target URL" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>BANNER ARTWORK</Text>
                    <TouchableOpacity style={styles.imagePickerSmall} onPress={handleEditPickImage} activeOpacity={0.8}>
                      <Image source={{ uri: editImageUri || item.image_url }} style={styles.previewImage} resizeMode="cover" />
                      <View style={styles.editImageOverlay}>
                        <Text style={styles.editImageText}>Change Image</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.editActionsExpanded}>
                    <TouchableOpacity style={styles.cancelExpandedBtn} onPress={() => { setEditingId(null); setEditImageUri(null); }}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.saveExpandedBtn} onPress={() => handleSaveEdit(item.id, type)}><Text style={styles.btnText}>Save Changes</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.adRow}>
                  <Image source={{ uri: item.image_url }} style={styles.adRowImage} />
                  <View style={styles.adRowContent}>
                    <Text style={styles.adRowTitle} numberOfLines={1}>
                      {item.title.replace("[OFFER] ", "")}
                      {!item.is_active && <Text style={{color: '#FF6B6B', fontSize: 11}}> (Paused)</Text>}
                    </Text>
                    <Text style={styles.adRowLink} numberOfLines={1}>
                      {item.target_url || "No target URL"}
                    </Text>
                  </View>
                  <View style={styles.adRowActions}>
                    <TouchableOpacity style={styles.iconBtnMinimal} onPress={() => { setEditingId(item.id); setEditTitle(item.title.replace("[OFFER] ", "")); setEditTargetUrl(item.target_url); setEditImageUri(null); }}>
                      <EditIcon size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtnMinimal} onPress={() => handleToggleActive(item.id, item.is_active)}>
                      {item.is_active ? <PauseIcon size={20} color={colors.textSecondary} /> : <PlayIcon size={20} color={colors.textSecondary} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtnMinimal} onPress={() => handleDelete(item.id)}>
                      <TrashIcon size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Screen scroll bottomNavItems={[]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeftIcon size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.badgeRow}>
          <AdsIcon size={14} color={colors.accent} />
          <Text style={styles.superAdminText}>MARKETING</Text>
        </View>
        <Text style={styles.title}>Marketing Hub</Text>
        <Text style={styles.subtitle}>Manage campaigns and promotional offers</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ads' && styles.activeTab]}
          onPress={() => {
            setActiveTab('ads');
            setTitle("");
            setImageUri(null);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'ads' && styles.activeTabText]}>Advertisements</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => {
            setActiveTab('offers');
            setTitle("");
            setImageUri(null);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>Offers</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ads' ? (
        <>
          {renderUploadForm('ads')}
          {renderList(ads, 'ads')}
        </>
      ) : (
        <>
          {renderUploadForm('offers')}
          {renderList(offers, 'offers')}
        </>
      )}

      <View style={{ height: 60 }} />
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  header: {
    marginBottom: 24
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
    marginBottom: 8
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8
  },
  superAdminText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
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
  tabContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  activeTab: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 13
  },
  activeTabText: {
    color: "#FFFFFF"
  },
  uploadSection: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 24,
    letterSpacing: -0.5
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8
  },
  premiumInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    borderRadius: 12
  },
  imagePicker: {
    height: 160,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    overflow: "hidden"
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  imagePickerIcon: {
    color: colors.textMuted,
    fontSize: 28,
    fontWeight: "300",
    marginBottom: 8
  },
  imagePickerText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 13
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  uploadBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },
  uploadBtnDisabled: {
    opacity: 0.7
  },
  uploadBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.5
  },
  activeSection: {
    marginBottom: 20
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20
  },
  activeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary
  },
  activeBadge: {
    backgroundColor: "rgba(52, 168, 83, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(52, 168, 83, 0.3)"
  },
  activeBadgeText: {
    color: "#34A853",
    fontWeight: "800",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600"
  },
  adsList: {
    gap: 20
  },
  adCard: {
    width: "100%",
    height: 180,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border
  },
  adImage: {
    width: "100%",
    height: "100%",
    position: "absolute"
  },
  adGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16
  },
  adContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  adTextContainer: {
    flex: 1,
    marginRight: 16
  },
  adTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  adLink: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  deleteBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)"
  },
  deleteBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13
  },
  // Offers Tab specific styles
  offersSection: {
    flex: 1
  },
  offersDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 20
  },
  flashSaleCard: {
    backgroundColor: "#16133B",
    borderRadius: 24,
    padding: 24,
    width: "100%"
  },
  flashSaleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24
  },
  flashSalePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#322A76",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8
  },
  flashSaleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F93C65"
  },
  flashSalePillText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1
  },
  flashSaleDiscountBadge: {
    borderWidth: 1.5,
    borderColor: "#FACC15",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center"
  },
  flashSaleDiscountTextLarge: {
    color: "#FACC15",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20
  },
  flashSaleDiscountTextSmall: {
    color: "#FACC15",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 12
  },
  flashSaleTextContainer: {
    marginBottom: 32
  },
  flashSaleHeading: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 12
  },
  flashSaleHeadingFaded: {
    color: "rgba(255,255,255,0.3)"
  },
  flashSaleHeadingHighlight: {
    color: "#FACC15"
  },
  flashSaleSubtext: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    fontWeight: "500"
  },
  flashSaleShopBtn: {
    backgroundColor: "#635BFF",
    alignSelf: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  flashSaleShopBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 16
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  iconBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBtnText: {
    fontSize: 16
  },
  editContainer: {
    padding: 8,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    marginTop: 8
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#000',
    height: 40
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end'
  },
  saveBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6
  },
  btnText: {
    color: '#fff',
    fontWeight: '600'
  },
  adRowContainer: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden'
  },
  adRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center'
  },
  adRowImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.border
  },
  adRowContent: {
    flex: 1,
    marginLeft: 12
  },
  adRowTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4
  },
  adRowLink: {
    color: colors.textSecondary,
    fontSize: 11
  },
  adRowActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconBtnMinimal: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  iconBtnTextMinimal: {
    fontSize: 16
  },
  editExpandedContainer: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  editSectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16
  },
  imagePickerSmall: {
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  editImageText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600'
  },
  editActionsExpanded: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16
  },
  saveExpandedBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  cancelExpandedBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  }
});