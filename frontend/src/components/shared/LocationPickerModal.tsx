/**
 * OmniQ - Zepto-style Location Picker Modal.
 * High-performance, cross-platform (Web, Android, iOS) address and map selector.
 * Integrates Google Places Autocomplete, Reverse Geocoding, and GPS auto-detection
 * without exposing clunky raw numeric coordinate fields to the user.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/store/useThemeStore";
import { LocationIcon } from "@/components/ui/LocationIcon";
import { SearchIcon } from "@/components/ui/SearchIcon";
import { fetchCurrentLocation } from "@/utils/location";
import {
  searchPlacesAutocomplete,
  fetchPlaceDetails,
  reverseGeocodeCoords,
  generatePlacesSessionToken,
  type PlaceSuggestion,
  type GeocodedAddress,
} from "@/utils/googleMaps";
import { config } from "@/constants/config";

export interface SelectedLocationData {
  lat: number;
  lng: number;
  formattedAddress: string;
  city: string;
  state: string;
  pincode: string;
  area?: string;
  street?: string;
}

export interface LocationPickerModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  initialLocation?: { lat?: number; lng?: number; address?: string };
  onClose: () => void;
  onSelect: (location: SelectedLocationData) => void;
}

export function LocationPickerModal({
  visible,
  title = "Select Delivery Location",
  subtitle = "Search your address or use GPS to find nearest hub",
  initialLocation,
  onClose,
  onSelect,
}: LocationPickerModalProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodedAddress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionTokenRef = useRef<string>(generatePlacesSessionToken());
  const debounceTimerRef = useRef<any>(null);

  // Initialize or reset when modal becomes visible
  useEffect(() => {
    if (visible) {
      sessionTokenRef.current = generatePlacesSessionToken();
      setSearchQuery("");
      setSuggestions([]);
      setErrorMessage(null);

      if (initialLocation?.lat && initialLocation?.lng) {
        setSelectedLocation({
          lat: initialLocation.lat,
          lng: initialLocation.lng,
          formattedAddress: initialLocation.address || `${initialLocation.lat.toFixed(4)}, ${initialLocation.lng.toFixed(4)}`,
          city: "",
          state: "",
          pincode: "",
          area: "",
          street: "",
        });
      }
    }
  }, [visible, initialLocation]);

  // Debounced places search
  const handleQueryChange = (text: string) => {
    setSearchQuery(text);
    setErrorMessage(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlacesAutocomplete(text, sessionTokenRef.current);
        setSuggestions(results);
      } catch (err) {
        console.warn("[LocationPickerModal] Autocomplete error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Handle selecting a place from Google Places suggestions
  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setIsDetailsLoading(true);
    setErrorMessage(null);
    try {
      const details = await fetchPlaceDetails(
        suggestion.placeId,
        sessionTokenRef.current,
        { lat: suggestion.lat, lng: suggestion.lng }
      );
      if (details) {
        setSelectedLocation(details);
        setSuggestions([]);
        setSearchQuery(details.formattedAddress || suggestion.mainText);
        // Refresh session token after successful completion
        sessionTokenRef.current = generatePlacesSessionToken();
      } else {
        setErrorMessage("Could not fetch address details for this location. Please try another.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load location details.");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Handle "Use Current Location" button
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMessage(null);
    try {
      const coords = await fetchCurrentLocation();
      const geocoded = await reverseGeocodeCoords(coords.lat, coords.lng);
      if (geocoded) {
        setSelectedLocation(geocoded);
        setSearchQuery(geocoded.formattedAddress);
      } else {
        setSelectedLocation({
          lat: coords.lat,
          lng: coords.lng,
          formattedAddress: `Current Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
          city: "",
          state: "",
          pincode: "",
          area: "",
          street: "",
        });
        setSearchQuery("Current Location");
      }
      setSuggestions([]);
    } catch (err: any) {
      setErrorMessage(err?.message || "Could not detect GPS location. Please check location permissions.");
    } finally {
      setIsLocating(false);
    }
  };

  // Confirm selection and pass back to parent
  const handleConfirm = () => {
    if (!selectedLocation) return;
    onSelect(selectedLocation);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputWrapper}>
            <SearchIcon size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search area, landmark, apartment..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleQueryChange}
              autoFocus={!initialLocation?.lat}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
            {isSearching && <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: 6 }} />}
          </View>
        </View>

        {/* Error Notification */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Use Current Location Button */}
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
            activeOpacity={0.8}
          >
            <View style={styles.gpsIconCircle}>
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <LocationIcon size={18} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.gpsTextContainer}>
              <Text style={styles.gpsTitle}>Use Current Location</Text>
              <Text style={styles.gpsSubtitle}>
                {isLocating ? "Fetching high-accuracy GPS..." : "Tap to detect using device GPS"}
              </Text>
            </View>
            <Text style={styles.gpsChevron}>›</Text>
          </TouchableOpacity>

          {/* Quick Town Suggestions */}
          {!selectedLocation && suggestions.length === 0 && (
            <View style={styles.quickTownsSection}>
              <Text style={styles.quickTownsHeader}>QUICK SELECT / SEARCH AREA</Text>
              <View style={styles.quickTownsRow}>
                {["Tungidighi", "Karandighi", "Raiganj", "Dalkhola", "Kolkata", "Bengaluru"].map((town) => (
                  <TouchableOpacity
                    key={town}
                    style={styles.quickTownChip}
                    onPress={() => handleQueryChange(town)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickTownChipText}>📍 {town}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsHeader}>SEARCH RESULTS</Text>
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectSuggestion(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionIconWrapper}>
                    <LocationIcon size={16} color={colors.accent} />
                  </View>
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                    {item.secondaryText ? (
                      <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Loading indicator when resolving place details */}
          {isDetailsLoading && (
            <View style={styles.loadingDetailsContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingDetailsText}>Resolving exact location details...</Text>
            </View>
          )}

          {/* Visual Map Preview & Selected Address Card */}
          {selectedLocation && !isDetailsLoading && suggestions.length === 0 && (
            <View style={styles.selectedSection}>
              {/* Interactive Google Map on Web / High-Res Map Snapshot on Native */}
              {Platform.OS === "web" && config.googleMapsKey ? (
                <View style={styles.mapContainer}>
                  {React.createElement("iframe", {
                    title: "Google Map Location",
                    width: "100%",
                    height: "220",
                    style: { border: 0, borderRadius: 16 },
                    loading: "lazy",
                    allowFullScreen: true,
                    src: `https://www.google.com/maps/embed/v1/place?key=${config.googleMapsKey}&q=${selectedLocation.lat},${selectedLocation.lng}&zoom=16`,
                  })}
                  <View style={styles.mapCenterPinOverlay} pointerEvents="none">
                    <LocationIcon size={28} color="#EF4444" />
                  </View>
                </View>
              ) : config.googleMapsKey ? (
                <View style={styles.mapContainer}>
                  <Image
                    source={{
                      uri: `https://maps.googleapis.com/maps/api/staticmap?center=${selectedLocation.lat},${selectedLocation.lng}&zoom=16&size=600x300&scale=2&maptype=roadmap&markers=color:red%7C${selectedLocation.lat},${selectedLocation.lng}&key=${config.googleMapsKey}`,
                    }}
                    style={{ width: "100%", height: 220 }}
                    contentFit="cover"
                  />
                  <View style={styles.mapCenterPinOverlay} pointerEvents="none">
                    <LocationIcon size={28} color="#EF4444" />
                  </View>
                </View>
              ) : (
                <View style={styles.nativeMapCard}>
                  <View style={styles.nativeMapIconCircle}>
                    <LocationIcon size={28} color={colors.accent} />
                  </View>
                  <Text style={styles.nativeMapTitle}>Pin Dropped Successfully</Text>
                  <Text style={styles.nativeMapCoords}>
                    {selectedLocation.lat.toFixed(5)}° N, {selectedLocation.lng.toFixed(5)}° E
                  </Text>
                </View>
              )}

              {/* Address Details Card */}
              <View style={styles.addressCard}>
                <View style={styles.addressCardHeader}>
                  <View style={styles.addressBadge}>
                    <Text style={styles.addressBadgeText}>CONFIRMED LOCATION</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedLocation(null);
                      setSearchQuery("");
                      setSuggestions([]);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "700" }}>Change / Search</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.addressHeading} numberOfLines={2}>
                  {selectedLocation.area || selectedLocation.city || "Selected Address"}
                </Text>
                <Text style={styles.addressFullText}>
                  {selectedLocation.formattedAddress}
                </Text>

                {(selectedLocation.city || selectedLocation.pincode) && (
                  <View style={styles.addressMetadataRow}>
                    {selectedLocation.city ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>City: {selectedLocation.city}</Text>
                      </View>
                    ) : null}
                    {selectedLocation.pincode ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>PIN: {selectedLocation.pincode}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Confirmation Bar */}
        {selectedLocation && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmButtonText}>Confirm & Select This Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "ios" ? 54 : 20,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.border + "40",
      marginLeft: 12,
    },
    closeButtonText: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    searchSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    searchInputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgPrimary,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      marginLeft: 8,
      paddingVertical: 0,
    },
    clearSearchText: {
      fontSize: 14,
      color: colors.textSecondary,
      paddingHorizontal: 6,
    },
    errorBanner: {
      backgroundColor: "#FEE2E2",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderLeftWidth: 4,
      borderLeftColor: "#EF4444",
    },
    errorBannerText: {
      fontSize: 13,
      color: "#991B1B",
    },
    scrollContent: {
      flex: 1,
    },
    gpsButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accent + "30",
    },
    gpsIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    gpsTextContainer: {
      flex: 1,
    },
    gpsTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.accent,
    },
    gpsSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    gpsChevron: {
      fontSize: 22,
      color: colors.accent,
      fontWeight: "300",
    },
    quickTownsSection: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 12,
    },
    quickTownsHeader: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    quickTownsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    quickTownChip: {
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickTownChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    suggestionsContainer: {
      marginHorizontal: 16,
      marginTop: 6,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    suggestionsHeader: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    suggestionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    suggestionIconWrapper: {
      marginRight: 12,
    },
    suggestionTextContainer: {
      flex: 1,
    },
    suggestionMainText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    suggestionSecondaryText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    loadingDetailsContainer: {
      padding: 30,
      alignItems: "center",
    },
    loadingDetailsText: {
      marginTop: 10,
      fontSize: 13,
      color: colors.textSecondary,
    },
    selectedSection: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 24,
    },
    mapContainer: {
      height: 220,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      position: "relative",
    },
    mapCenterPinOverlay: {
      position: "absolute",
      top: "50%",
      left: "50%",
      marginLeft: -14,
      marginTop: -28,
    },
    nativeMapCard: {
      height: 140,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    nativeMapIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    nativeMapTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    nativeMapCoords: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    addressCard: {
      marginTop: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addressCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    addressBadge: {
      backgroundColor: "#ECFDF5",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    addressBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#059669",
      letterSpacing: 0.5,
    },
    addressHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    addressFullText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    addressMetadataRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    metaChip: {
      backgroundColor: colors.bgPrimary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaChipText: {
      fontSize: 11,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 34 : 16,
      backgroundColor: colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    confirmButton: {
      backgroundColor: colors.accent,
      height: 50,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    confirmButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });
}
