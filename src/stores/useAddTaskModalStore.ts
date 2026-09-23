import { create } from 'zustand';

export interface FabOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AddTaskModalState {
  isOpen: boolean;
  origin: FabOrigin | null;
  setOrigin: (origin: FabOrigin) => void;
  openModal: (origin?: FabOrigin) => void;
  closeModal: () => void;
}

export const useAddTaskModalStore = create<AddTaskModalState>((set, get) => ({
  isOpen: false,
  origin: null,
  setOrigin: (origin) => set({ origin }),
  openModal: (origin) => set({ isOpen: true, origin: origin ?? get().origin }),
  closeModal: () => set({ isOpen: false }),
}));
