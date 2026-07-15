import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, ThemeColors } from '@/constants/colors';
export type ThemeMode = 'light';
interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}
const getColorsForMode = (): ThemeColors => {
  return lightTheme;
};
export const useAppTheme = create<ThemeState>()(persist(set => ({
  mode: 'light',
  colors: getColorsForMode(),
  setMode: (mode: ThemeMode) => set({
    mode: 'light',
    colors: getColorsForMode()
  })
}), {
  name: 'omniq-theme-storage',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ mode: state.mode }), // Only persist the mode, not the colors object!
  onRehydrateStorage: () => (state) => {
    if (state) {
      state.setMode('light');
    }
  }
}));