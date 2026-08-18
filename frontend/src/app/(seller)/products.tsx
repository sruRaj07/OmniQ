/**
 * OmniQ mobile app - seller product management.
 *
 * The listing form used to sit permanently above the inventory, so a seller with forty
 * products scrolled past an empty form to reach every one of them. The form is now a sheet
 * and the screen is what it should be: a searchable, filterable inventory list.
 *
 * Author: OmniQ Team
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { ProductForm } from "@/components/seller/ProductForm";
import { ProductListItem } from "@/components/seller/ProductListItem";
import { SELLER_NAV_ITEMS } from "@/components/seller/sellerNav";
import { SellerToast, type ToastPayload } from "@/components/seller/SellerToast";
import { EmptyState, SegmentedTabs, SkeletonRows, type SegmentItem } from "@/components/seller/SellerUI";
import { Screen } from "@/components/shared/Screen";
import { useThemeColors } from "@/store/useThemeStore";
import { useSellerProducts } from "@/hooks/useProducts";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { RADIUS, SHADOW, SPACE, stockOf } from "@/constants/sellerTheme";
import { PackageIcon, PlusIcon, SearchIcon, XIcon } from "@/components/ui/SellerIcons";

type InventoryFilter = "all" | "live" | "review" | "rejected" | "stock";

const FILTER_KEYS: InventoryFilter[] = ["all", "live", "review", "rejected", "stock"];

/**
 * Declared at module scope so its component type is stable. Passing an inline arrow to
 * `ListHeaderComponent` would remount the header on every keystroke and drop focus out of
 * the search field mid-word.
 */
const InventoryHeader = React.memo(function InventoryHeader({
  total,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  segments,
  onCompose,
  colors,
}: {
  total: number;
  query: string;
  onQueryChange: (value: string) => void;
  filter: InventoryFilter;
  onFilterChange: (key: string) => void;
  segments: SegmentItem[];
  onCompose: () => void;
  colors: any;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>
            {total} listing{total === 1 ? "" : "s"}
          </Text>
        </View>
        <Pressable
          onPress={onCompose}
          accessibilityRole="button"
          accessibilityLabel="Add a product"
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <PlusIcon size={16} color="#FFFFFF" strokeWidth={2.6} />
          <Text style={styles.addLabel}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <SearchIcon size={17} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search your listings"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => onQueryChange("")} hitSlop={8} accessibilityLabel="Clear search">
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filters}>
        <SegmentedTabs items={segments} value={filter} onChange={onFilterChange} />
      </View>
    </View>
  );
});

export default function SellerProductsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const refreshControl = useRefreshControl();
  const { products, isLoading } = useSellerProducts();
  const params = useLocalSearchParams<{ compose?: string; filter?: string }>();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [toast, setToast] = useState<ToastPayload>(null);

  // The dashboard deep-links in with ?compose=1 / ?filter=stock. Consume each value once so
  // reopening the sheet after a manual close does not fight the URL that is still in place.
  const consumedParams = useRef<string | null>(null);
  useEffect(() => {
    const signature = `${params.compose ?? ""}|${params.filter ?? ""}`;
    if (signature === "|" || consumedParams.current === signature) return;
    consumedParams.current = signature;
    if (params.compose === "1") {
      setEditingProduct(null);
      setSheetOpen(true);
    }
    if (params.filter && FILTER_KEYS.includes(params.filter as InventoryFilter)) {
      setFilter(params.filter as InventoryFilter);
    }
  }, [params.compose, params.filter]);

  const counts = useMemo(() => {
    let live = 0;
    let review = 0;
    let rejected = 0;
    let stockIssues = 0;
    for (const product of products as any[]) {
      if (product.is_flagged) rejected += 1;
      else if (product.is_approved) live += 1;
      else review += 1;
      if (stockOf(product) === 0) stockIssues += 1;
    }
    return { live, review, rejected, stockIssues };
  }, [products]);

  const segments = useMemo<SegmentItem[]>(
    () => [
      { key: "all", label: "All", count: products.length },
      { key: "live", label: "Live", count: counts.live },
      { key: "review", label: "In review", count: counts.review },
      { key: "rejected", label: "Rejected", count: counts.rejected },
      { key: "stock", label: "Out of stock", count: counts.stockIssues },
    ],
    [counts, products.length]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (products as any[]).filter((product) => {
      if (filter === "live" && !(product.is_approved && !product.is_flagged)) return false;
      if (filter === "review" && !(!product.is_approved && !product.is_flagged)) return false;
      if (filter === "rejected" && !product.is_flagged) return false;
      if (filter === "stock" && stockOf(product) !== 0) return false;
      if (!needle) return true;
      return (
        String(product.title ?? "").toLowerCase().includes(needle) ||
        String(product.category ?? "").toLowerCase().includes(needle)
      );
    });
  }, [filter, products, query]);

  const openCompose = useCallback(() => {
    setEditingProduct(null);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((product: any) => {
    setEditingProduct(product);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingProduct(null);
  }, []);

  const handleSaved = useCallback(
    (mode: "created" | "updated") => {
      setSheetOpen(false);
      setEditingProduct(null);
      setToast({
        message:
          mode === "created"
            ? "Listing submitted — it goes live once approved."
            : "Listing updated and sent for approval.",
        tone: "success",
      });
    },
    []
  );

  const hideToast = useCallback(() => setToast(null), []);
  const handleFilterChange = useCallback((key: string) => setFilter(key as InventoryFilter), []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => <ProductListItem product={item} onEdit={openEdit} />,
    [openEdit]
  );

  const keyExtractor = useCallback((item: any) => String(item.id), []);

  const header = (
    <InventoryHeader
      total={products.length}
      query={query}
      onQueryChange={setQuery}
      filter={filter}
      onFilterChange={handleFilterChange}
      segments={segments}
      onCompose={openCompose}
      colors={colors}
    />
  );

  return (
    <Screen scroll={false} bottomNavItems={SELLER_NAV_ITEMS}>
      {isLoading ? (
        <>
          {header}
          <SkeletonRows count={5} />
        </>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={refreshControl}
          ListHeaderComponent={header}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          {...({ estimatedItemSize: 108 } as any)}
          ListEmptyComponent={
            products.length === 0 ? (
              <EmptyState
                icon={PackageIcon}
                title="No listings yet"
                message="Add your first product and it will be live for buyers as soon as it clears approval."
                actionLabel="Add your first product"
                onAction={openCompose}
              />
            ) : (
              <EmptyState
                icon={SearchIcon}
                title="Nothing matches"
                message="Try a different search term or clear the filter to see all your listings."
                compact
              />
            )
          }
        />
      )}

      <Pressable
        onPress={openCompose}
        accessibilityRole="button"
        accessibilityLabel="Add a product"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <PlusIcon size={24} color="#FFFFFF" strokeWidth={2.6} />
      </Pressable>

      <SellerToast toast={toast} onHide={hideToast} />

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={closeSheet}>
        <View style={styles.sheetOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.sheet}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>{editingProduct ? "Edit listing" : "New listing"}</Text>
                <Text style={styles.sheetSubtitle}>
                  {editingProduct ? "Changes go back through approval" : "Approved listings usually go live within 24 hours"}
                </Text>
              </View>
              <Pressable
                onPress={closeSheet}
                hitSlop={10}
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.sheetClose, pressed && styles.sheetClosePressed]}
              >
                <XIcon size={18} color={colors.textSecondary} strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ProductForm initialData={editingProduct} onCloseEdit={closeSheet} onSaved={handleSaved} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    header: { paddingBottom: SPACE.lg },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.md },
    titleText: { flex: 1, minWidth: 0 },
    title: { color: colors.textPrimary, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
    subtitle: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 2 },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: SPACE.lg,
      paddingVertical: 10,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.accent,
      ...SHADOW.sm,
    },
    addButtonPressed: { opacity: 0.85 },
    addLabel: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "800" },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.sm,
      marginTop: SPACE.lg,
      paddingHorizontal: SPACE.md,
      height: 46,
      borderRadius: RADIUS.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      color: colors.textPrimary,
      fontSize: 14.5,
      fontWeight: "500",
      padding: 0,
    },
    filters: { marginTop: SPACE.md },
    listContent: { paddingBottom: 130 },
    fab: {
      position: "absolute",
      right: 0,
      bottom: 104,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      ...SHADOW.lg,
    },
    fabPressed: { opacity: 0.88 },
    sheetOverlay: { flex: 1, backgroundColor: "rgba(20,19,17,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.bgPrimary,
      borderTopLeftRadius: RADIUS.xxl,
      borderTopRightRadius: RADIUS.xxl,
      maxHeight: "94%",
      width: "100%",
      maxWidth: 500,
      alignSelf: "center",
      ...SHADOW.lg,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: SPACE.md,
      paddingHorizontal: SPACE.xl,
      paddingTop: SPACE.xl,
      paddingBottom: SPACE.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetHeaderText: { flex: 1, minWidth: 0 },
    sheetTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
    sheetSubtitle: { color: colors.textMuted, fontSize: 12.5, fontWeight: "500", marginTop: 3 },
    sheetClose: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.md,
      backgroundColor: colors.bgTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetClosePressed: { opacity: 0.7 },
    sheetScroll: { flexGrow: 0 },
    sheetContent: { padding: SPACE.xl, paddingBottom: SPACE.xxxl },
  });
