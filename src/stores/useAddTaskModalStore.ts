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
  initialDate?: string | null;
  initialTitle?: string | null;
  setOrigin: (origin: FabOrigin) => void;
  openModal: (
    origin?: FabOrigin,
    initialPrayer?: Prayer | null,
    initialDate?: string | null,
    initialTitle?: string | null
  ) => void;
  closeModal: () => void;
}

export const useAddTaskModalStore = create<AddTaskModalState>((set, get) => ({
  isOpen: false,
  origin: null,
  initialPrayer: null,
  initialDate: null,
  initialTitle: null,
  setOrigin: (origin) => set({ origin }),
  openModal: (origin, initialPrayer, initialDate, initialTitle) =>
    set({
      isOpen: true,
      origin: origin ?? get().origin,
      initialPrayer: initialPrayer !== undefined ? initialPrayer : get().initialPrayer,
      initialDate: initialDate !== undefined ? initialDate : null,
      initialTitle: initialTitle !== undefined ? initialTitle : null,
    }),
  closeModal: () =>
    set({
      isOpen: false,
      initialPrayer: null,
      initialDate: null,
      initialTitle: null,
    }),
}));

