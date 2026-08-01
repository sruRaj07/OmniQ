import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, type ThemeColors } from '@/constants/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

/**
 * CRITICAL FIX: Return the SAME frozen object reference every time.
 * Previously, getColorsForMode() returned a new object on each call,
 * causing Zustand to notify all subscribers (every component using
 * useAppTheme) even though the actual color values never changed.
 * This was the root cause of ProductCard re-rendering 4+ times.
 */
const LIGHT_COLORS: ThemeColors = Object.freeze(lightTheme);

const getColorsForMode = (_mode?: ThemeMode): ThemeColors => {
  // When dark mode is implemented, switch here:
  // if (mode === 'dark') return DARK_COLORS;
  return LIGHT_COLORS;
};

export const useAppTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      colors: LIGHT_COLORS,
      setMode: (mode: ThemeMode) => {
        const newColors = getColorsForMode(mode);
        // Only trigger a state update if colors actually changed reference
        if (get().colors === newColors && get().mode === mode) return;
        set({ mode, colors: newColors });
      },
    }),
    {
      name: 'omniq-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        // Rehydrate using the stable reference — no unnecessary re-renders
        if (state) {
          const colors = getColorsForMode(state.mode);
          if (state.colors !== colors) {
            state.colors = colors;
          }
        }
      },
    }
  )
);

/**
 * Stable colors-only selector for leaf UI components (ProductCard, CartItem, etc).
 * Uses Zustand shallow equality so the component only re-renders when
 * the colors reference actually changes — NOT on mode or setMode updates.
 */
export const useThemeColors = () => useAppTheme((s) => s.colors);