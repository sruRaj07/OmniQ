import { create } from 'zustand';

type SlideDirection = 'slide_from_right' | 'slide_from_left';

interface NavState {
  slideDirection: SlideDirection;
  setSlideDirection: (dir: SlideDirection) => void;
}

export const useNavStore = create<NavState>((set) => ({
  slideDirection: 'slide_from_right',
  setSlideDirection: (dir) => set({ slideDirection: dir }),
}));
