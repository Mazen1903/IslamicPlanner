import { create } from 'zustand';
import type { Prayer } from '@/constants/prayers';

export interface FabOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AddTaskModalState {
  isOpen: boolean;
  origin: FabOrigin | null;
  initialPrayer?: Prayer | null;
  setOrigin: (origin: FabOrigin) => void;
  openModal: (origin?: FabOrigin, initialPrayer?: Prayer | null) => void;
  closeModal: () => void;
}

export const useAddTaskModalStore = create<AddTaskModalState>((set, get) => ({
  isOpen: false,
  origin: null,
  initialPrayer: null,
  setOrigin: (origin) => set({ origin }),
  openModal: (origin, initialPrayer) =>
    set({
      isOpen: true,
      origin: origin ?? get().origin,
      initialPrayer: initialPrayer !== undefined ? initialPrayer : get().initialPrayer,
    }),
  closeModal: () => set({ isOpen: false, initialPrayer: null }),
}));

