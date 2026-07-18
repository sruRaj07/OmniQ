/**
 * OmniQ mobile app - Amazon-style search screen.
 * Author: OmniQ Team
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Keyboard, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path, Line, Circle, Rect } from "react-native-svg";
import { ProductCard } from "@/components/buyer/ProductCard";
import { Screen } from "@/components/shared/Screen";
import { HomeIcon } from "@/components/ui/HomeIcon";
import { ShoppingCartIcon } from "@/components/ui/ShoppingCartIcon";
import { BoxIcon } from "@/components/ui/BoxIcon";
import { UserIcon } from "@/components/ui/UserIcon";
import { MenuIcon } from "@/components/ui/MenuIcon";
import { useAppTheme } from "@/store/useThemeStore";
import { useSearch, type SortOption } from "@/hooks/useSearch";
import { apiClient } from "@/lib/apiClient";

/* ── Inline SVG Icons ─────────────────────────────────────────────────── */

function SearchSvg({
  color,
  size = 22
}: any) {
  const {
    colors
  } = useAppTheme();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || colors.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>;
}
function ArrowLeftSvg({
  color,
  size = 26
}: any) {
  const {
    colors
  } = useAppTheme();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || colors.textPrimary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>;
}
function ClockSvg({
  color,
  size = 16
}: any) {
  const {
    colors
  } = useAppTheme();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v6l4 2" />
    </Svg>;
}
function TrendingSvg({
  color,
  size = 16
}: any) {
  const {
    colors
  } = useAppTheme();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || colors.accentLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 6l-9.5 9.5-5-5L1 18" />
      <Path d="M17 6h6v6" />
    </Svg>;
}
function CloseSvg({
  color,
  size = 18
}: any) {
  const {
    colors
  } = useAppTheme();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>;
}

/* ── Sort options ─────────────────────────────────────────────────────── */

const SORT_OPTIONS: {
  label: string;
  value: SortOption;
}[] = [{
  label: "Relevance",
  value: "relevance"
}, {
  label: "Price: Low → High",
  value: "price_asc"
}, {
  label: "Price: High → Low",
  value: "price_desc"
}, {
  label: "Newest First",
  value: "newest"
}];

/* ── Category quick filters — fetched dynamically from DB ─────────────── */

function useProductCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const {
          data
        } = await apiClient.get("/products");
        const products: any[] = data?.data || [];
        const uniqueCats = [...new Set(products.map((p: any) => p.category).filter(Boolean))] as string[];
        setCategories(uniqueCats);
      } catch {
        // fallback empty
      }
    })();
  }, []);
  return categories;
}
function usePopularProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const {
          data
        } = await apiClient.get("/products", {
          params: {
            limit: 6
          }
        });
        setProducts(data?.data || []);
      } catch {
        // fallback empty
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);
  return {
    products,
    isLoading
  };
}

import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence } from "react-native-reanimated";

/* ── Animated Suggestion Item ─────────────────────────────────────────── */

function AnimatedSuggestion({
  text,
  query,
  index,
  onPress
}: {
  text: string;
  query: string;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  
  const anim = useSharedValue(0);
  
  useEffect(() => {
    anim.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
  }, [index, anim]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateX: (1 - anim.value) * 30 }] // interpolate 0 -> 30, 1 -> 0
  }));

  // Highlight matching portion
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity style={styles.suggestionRow} onPress={onPress} activeOpacity={0.6}>
        <SearchSvg color={colors.textMuted} size={16} />
        <Text style={styles.suggestionText}>
          {matchIndex >= 0 ? <>
              {text.substring(0, matchIndex)}
              <Text style={styles.suggestionHighlight}>{text.substring(matchIndex, matchIndex + query.length)}</Text>
              {text.substring(matchIndex + query.length)}
            </> : text}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Skeleton Loader ──────────────────────────────────────────────────── */

function SkeletonCard({
  index
}: {
  index: number;
}) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const pulse = useSharedValue(0.3);
  
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );
  }, [pulse]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value
  }));

  return (
    <Animated.View style={[styles.skeletonCard, animatedStyle]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: "60%" }]} />
    </Animated.View>
  );
}

/* ── Main Search Screen ───────────────────────────────────────────────── */

export default function SearchScreen() {
  const {
    colors
  } = useAppTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    suggestions,
    total,
    isLoading,
    isFetchingMore,
    recentSearches,
    executeSearch,
    loadMore,
    clearRecentSearches,
    removeRecentSearch
  } = useSearch();
  const dbCategories = useProductCategories();
  const {
    products: popularProducts,
    isLoading: isPopularLoading
  } = usePopularProducts();
  const [activeSort, setActiveSort] = useState<SortOption>("relevance");
  const [showResults, setShowResults] = useState(false);

  // Auto-focus on mount
  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timeout);
  }, []);
  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setShowResults(true);
    executeSearch();
  }, [query, executeSearch]);
  const handleSuggestionPress = useCallback((text: string) => {
    setQuery(text);
    Keyboard.dismiss();
    setShowResults(true);
    executeSearch(text);
  }, [executeSearch]);
  const handleRecentPress = useCallback((text: string) => {
    setQuery(text);
    setShowResults(true);
    executeSearch(text);
  }, [executeSearch]);
  const handleCategoryFilter = useCallback((cat: string) => {
    const newCat = filters.category === cat ? undefined : cat;
    setFilters(f => ({
      ...f,
      category: newCat
    }));
    // Re-run search with updated category
    if (showResults && query.trim()) {
      setTimeout(() => executeSearch(), 100);
    }
  }, [filters.category, showResults, query, executeSearch]);
  const handleSortChange = useCallback((sortVal: SortOption) => {
    setActiveSort(sortVal);
    setFilters(f => ({
      ...f,
      sort: sortVal
    }));
    if (showResults && query.trim()) {
      setTimeout(() => executeSearch(), 100);
    }
  }, [showResults, query, executeSearch]);
  const handleClear = useCallback(() => {
    setQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  }, []);

  const handleScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 150;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMore();
    }
  }, [loadMore]);

  /* ── Render ──────────────────────────────────────────────────────────── */

  const isIdle = !query.trim() && !showResults;
  const isTyping = query.trim().length > 0 && !showResults;
  return <Screen scroll={true} bottomNavItems={[{
    href: "/(buyer)",
    icon: HomeIcon,
    label: "Home"
  }, {
    href: "/(buyer)/cart",
    icon: ShoppingCartIcon,
    label: "Cart"
  }, {
    href: "/(buyer)/browse",
    icon: MenuIcon,
    label: "Browse"
  }, {
    href: "/(buyer)/orders",
    icon: BoxIcon,
    label: "Orders"
  }, {
    href: "/(buyer)/profile",
    icon: UserIcon,
    label: "Profile"
  }]} onScroll={showResults ? handleScroll : undefined}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={styles.backBtn}>
          <ArrowLeftSvg size={26} />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <SearchSvg color="#888" size={18} />
          <TextInput ref={inputRef} style={styles.input} placeholder="Search OmniQ" placeholderTextColor="#888" value={query} onChangeText={text => {
          setQuery(text);
          if (showResults) setShowResults(false);
        }} onSubmitEditing={handleSubmit} returnKeyType="search" autoCorrect={false} />
          {query.length > 0 && <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <CloseSvg size={16} />
            </TouchableOpacity>}
        </View>
      </View>

      {/* ─── IDLE STATE: Recent searches + Trending categories ─── */}
      {isIdle && <View style={styles.idleContainer}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.clearText}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map(term => <TouchableOpacity key={term} style={styles.recentRow} onPress={() => handleRecentPress(term)} activeOpacity={0.6}>
                  <View style={styles.recentLeft}>
                    <ClockSvg />
                    <Text style={styles.recentText}>{term}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeRecentSearch(term)} hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }}>
                    <CloseSvg size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>)}
            </View>}

          {/* Trending Categories (from DB) */}
          {dbCategories.length > 0 && <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingSvg />
                <Text style={[styles.sectionTitle, {
            marginLeft: 8
          }]}>Browse Categories</Text>
              </View>
              <View style={styles.chipGrid}>
                {dbCategories.map(cat => <TouchableOpacity key={cat} style={styles.categoryChip} onPress={() => {
            setQuery(cat);
            setShowResults(true);
            executeSearch(cat);
          }} activeOpacity={0.7}>
                    <Text style={styles.chipText}>{cat}</Text>
                  </TouchableOpacity>)}
              </View>
            </View>}

          {/* Popular Products (from DB) */}
          {popularProducts.length > 0 && <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Right Now</Text>
              <View style={[styles.grid, {
          marginTop: 14
        }]}>
                {popularProducts.slice(0, 4).map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
              </View>
            </View>}
        </View>}

      {/* ─── TYPING STATE: Suggestions dropdown ─── */}
      {isTyping && suggestions.length > 0 && <View style={styles.suggestionsContainer}>
          {suggestions.map((s, i) => <AnimatedSuggestion key={s} text={s} query={query} index={i} onPress={() => handleSuggestionPress(s)} />)}
        </View>}

      {/* Typing state: show a "Search for ..." tap target */}
      {isTyping && <TouchableOpacity style={styles.searchForRow} onPress={handleSubmit}>
          <SearchSvg color={colors.accentLight} size={18} />
          <Text style={styles.searchForText}>
            Search for "<Text style={{
          fontWeight: "800",
          color: colors.textPrimary
        }}>{query}</Text>"
          </Text>
        </TouchableOpacity>}

      {/* ─── RESULTS STATE ─── */}
      {showResults && <View style={styles.resultsContainer}>
          {/* Filter & Sort Bar */}
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {dbCategories.map(cat => <TouchableOpacity key={cat} style={[styles.filterPill, filters.category === cat && styles.filterPillActive]} onPress={() => handleCategoryFilter(cat)} activeOpacity={0.7}>
                  <Text style={[styles.filterPillText, filters.category === cat && styles.filterPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>)}
            </ScrollView>
          </View>

          {/* Sort bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
            {SORT_OPTIONS.map(opt => <TouchableOpacity key={opt.value} style={[styles.sortChip, activeSort === opt.value && styles.sortChipActive]} onPress={() => handleSortChange(opt.value)} activeOpacity={0.7}>
                <Text style={[styles.sortChipText, activeSort === opt.value && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>)}
          </ScrollView>

          {/* Results count */}
          <Text style={styles.resultCount}>
            {isLoading ? "Searching..." : `${total} result${total !== 1 ? "s" : ""} found`}
          </Text>

          {/* Loading skeletons */}
          {isLoading && <View style={styles.grid}>
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} index={i} />)}
            </View>}

          {/* Product Results */}
          {!isLoading && results.length > 0 && <View style={styles.grid}>
              {results.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
            </View>}

          {/* Fetching more indicator */}
          {isFetchingMore && <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>}

          {/* Empty state */}
          {!isLoading && results.length === 0 && <View style={styles.emptyState}>
              <SearchSvg color={colors.textMuted} size={48} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Try different keywords or browse categories</Text>
            </View>}
        </View>}
    </Screen>;
}

/* ── Styles ────────────────────────────────────────────────────────────── */

const getStyles = (colors: any) => StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    marginTop: 4
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center"
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    height: "100%"
  },
  clearBtn: {
    padding: 4
  },
  /* ─── Idle ─── */
  idleContainer: {
    paddingTop: 8
  },
  section: {
    marginBottom: 28
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  clearText: {
    color: colors.accentLight,
    fontWeight: "700",
    fontSize: 13
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  recentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  recentText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500"
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  categoryChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 13
  },
  /* ─── Suggestions ─── */
  suggestionsContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  suggestionText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500"
  },
  suggestionHighlight: {
    color: colors.textPrimary,
    fontWeight: "800"
  },
  searchForRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 12
  },
  searchForText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500"
  },
  /* ─── Results ─── */
  resultsContainer: {
    paddingBottom: 40
  },
  filterBar: {
    marginBottom: 10
  },
  filterScroll: {
    gap: 8
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  filterPillActive: {
    backgroundColor: "rgba(108,99,255,0.15)",
    borderColor: colors.accentLight
  },
  filterPillText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 13
  },
  filterPillTextActive: {
    color: colors.accentLight,
    fontWeight: "800"
  },
  sortScroll: {
    gap: 8,
    marginBottom: 14,
    paddingVertical: 4
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border
  },
  sortChipActive: {
    backgroundColor: colors.card2,
    borderColor: colors.textMuted
  },
  sortChipText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 11
  },
  sortChipTextActive: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  /* ─── Skeleton ─── */
  skeletonCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14
  },
  skeletonImage: {
    width: "100%",
    height: 120,
    backgroundColor: colors.card2,
    borderRadius: 12,
    marginBottom: 10
  },
  skeletonLine: {
    height: 12,
    backgroundColor: colors.card2,
    borderRadius: 6,
    marginBottom: 6,
    width: "80%"
  },
  /* ─── Empty ─── */
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 8
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }
});