import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface AiChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;

  addMessage: (msg: Omit<ChatMessage, "id" | "createdAt">) => void;
  updateLastAssistantMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleOpen: () => void;
  open: () => void;
  close: () => void;
  clearMessages: () => void;
}

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useAiChatStore = create<AiChatState>((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  error: null,

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: generateId(),
          createdAt: new Date(),
        },
      ],
      error: null,
    })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      const lastIdx = msgs.findLastIndex((m) => m.role === "assistant");
      if (lastIdx >= 0) {
        msgs[lastIdx] = { ...msgs[lastIdx]!, content };
      }
      return { messages: msgs };
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  open: () => set({ isOpen: true }),

  close: () => set({ isOpen: false }),

  clearMessages: () => set({ messages: [], error: null }),
}));
