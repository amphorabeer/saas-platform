import { create } from "zustand";

interface FilterState {
  search: string;
  categoryId: string | null;
  setSearch: (s: string) => void;
  setCategoryId: (id: string | null) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  search: "",
  categoryId: null,
  setSearch: (search) => set({ search }),
  setCategoryId: (categoryId) => set({ categoryId }),
}));
