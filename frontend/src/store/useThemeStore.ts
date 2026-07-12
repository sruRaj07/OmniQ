import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { lightTheme, darkTheme, ThemeColors } from '@/constants/colors';
export type ThemeMode = 'light' | 'dark' | 'system';
interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}
const getColorsForMode = (mode: ThemeMode): ThemeColors => {
  if (mode === 'system') {
    const systemScheme = Appearance.getColorScheme();
    return systemScheme === 'light' ? lightTheme : darkTheme;
  }
  return mode === 'light' ? lightTheme : darkTheme;
};
export const useAppTheme = create<ThemeState>()(persist(set => ({
  mode: 'system',
  colors: getColorsForMode('system'),
  setMode: (mode: ThemeMode) => set({
    mode,
    colors: getColorsForMode(mode)
  })
}), {
  name: 'omniq-theme-storage',
  storage: createJSONStorage(() => AsyncStorage),
  onRehydrateStorage: () => state => {
    if (state) {
      // Ensure colors are updated on rehydration in case system theme changed
      state.setMode(state.mode);
    }
  }
}));