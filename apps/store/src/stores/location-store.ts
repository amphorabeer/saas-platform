"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocationState {
  currentStoreId: string | null;
  setCurrentStoreId: (id: string | null) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      currentStoreId: null,
      setCurrentStoreId: (id) => set({ currentStoreId: id }),
    }),
    { name: "pos-current-store" }
  )
);
