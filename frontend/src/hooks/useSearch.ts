/**
 * OmniQ mobile app - search hook with debounce, AbortController cancellation, and recent searches.
 * Author: OmniQ Team
 */
import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "@/lib/apiClient";
import type { Product } from "@/types/product.types";

const RECENT_SEARCHES_KEY = "@omniq_recent_searches";
const MAX_RECENT = 10;

export type SortOption = "relevance" | "price_asc" | "price_desc" | "newest";

export type SearchFilters = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
};

export function useSearch() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ⚡ ABORT CONTROLLER REFS: Instantaneous network cleanup on typing / rapid filter shifts
  const searchAbortRef = useRef<AbortController | null>(null);
  const suggestionAbortRef = useRef<AbortController | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Silently fail
    }
  };

  const saveRecentSearch = async (term: string) => {
    if (!term.trim()) return;
    try {
      const updated = [term.trim(), ...recentSearches.filter((s) => s.toLowerCase() !== term.trim().toLowerCase())].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const removeRecentSearch = async (term: string) => {
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Debounced search for suggestions (fires while typing)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (suggestionAbortRef.current) suggestionAbortRef.current.abort();

    if (!query.trim()) {
      setSuggestions([]);
      if (!isLoading) {
        setResults([]);
        setTotal(0);
      }
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(query.trim());
    }, 250);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (suggestionAbortRef.current) suggestionAbortRef.current.abort();
    };
  }, [query]);

  const fetchSuggestions = async (q: string) => {
    try {
      suggestionAbortRef.current = new AbortController();
      const { data } = await apiClient.get("/products/search", {
        params: { q, suggestions: "true", limit: 5 },
        signal: suggestionAbortRef.current.signal,
      });
      const meta = data?.meta;
      if (meta?.suggestions) {
        setSuggestions(meta.suggestions);
      }
    } catch (err: any) {
      if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
        // Silently ignore canceled aborted requests, log other errors if needed
      }
    }
  };

  // Full search (triggered on submit or suggestion tap)
  const executeSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!q) return;

      // Abort any inflight search request to guarantee zero race conditions
      if (searchAbortRef.current) searchAbortRef.current.abort();
      searchAbortRef.current = new AbortController();

      setIsLoading(true);
      try {
        const params: Record<string, string | number> = { q };
        if (filters.category) params.category = filters.category;
        if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
        if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
        if (filters.sort) params.sort = filters.sort;
        params.limit = 40;
        params.offset = 0;

        const { data } = await apiClient.get("/products/search", {
          params,
          signal: searchAbortRef.current.signal,
        });
        setResults(data?.data || []);
        setTotal(data?.meta?.total ?? 0);
        setOffset(40);
        setSuggestions([]);

        // Save to recent
        await saveRecentSearch(q);
      } catch (error: any) {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          return; // Ignore state updates for aborted obsolete queries
        }
        console.error("Search failed:", error);
        setResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [query, filters, recentSearches]
  );

  const loadMore = useCallback(
    async () => {
      const q = query.trim();
      if (!q || isLoading || isFetchingMore || results.length >= total) return;

      setIsFetchingMore(true);
      try {
        const params: Record<string, string | number> = { q };
        if (filters.category) params.category = filters.category;
        if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
        if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
        if (filters.sort) params.sort = filters.sort;
        params.limit = 40;
        params.offset = offset;

        const { data } = await apiClient.get("/products/search", { params });
        const newResults = data?.data || [];
        setResults((prev) => [...prev, ...newResults]);
        setTotal(data?.meta?.total ?? 0);
        setOffset((prev) => prev + newResults.length);
      } catch (error) {
        console.error("Load more failed:", error);
      } finally {
        setIsFetchingMore(false);
      }
    },
    [query, filters, offset, isLoading, isFetchingMore, results, total]
  );

  return {
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
    removeRecentSearch,
  };
}
