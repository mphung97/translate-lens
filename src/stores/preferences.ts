import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ByokProviderId, ProviderKeys } from "@/lib/secrets";
import { EMPTY_PROVIDER_KEYS, getAllKeys } from "@/lib/secrets";

export interface Preferences {
  targetLanguage: string;
  autoDetectSource: boolean;
  byokProvider: ByokProviderId;
}

const defaults: Preferences = {
  targetLanguage: "vietnamese",
  autoDetectSource: true,
  byokProvider: "groq",
};

interface PreferencesState extends Preferences {
  setTargetLanguage: (v: string | ((prev: string) => string)) => void;
  setAutoDetectSource: (v: boolean | ((prev: boolean) => boolean)) => void;
  setByokProvider: (v: ByokProviderId) => void;
  reset: () => void;
  /** BYOK keys, memory-only (never persisted). Loaded once at boot. */
  apiKeys: ProviderKeys;
  setApiKeysInMemory: (keys: ProviderKeys) => void;
  reloadKeys: () => Promise<void>;
}

function resolveValue<T>(v: T | ((prev: T) => T), prev: T): T {
  if (typeof v === "function") return (v as (prev: T) => T)(prev);
  return v;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...defaults,
      apiKeys: { ...EMPTY_PROVIDER_KEYS },

      setTargetLanguage: (v) =>
        set({ targetLanguage: resolveValue(v, get().targetLanguage) }),
      setAutoDetectSource: (v) =>
        set({ autoDetectSource: resolveValue(v, get().autoDetectSource) }),
      setByokProvider: (byokProvider) => set({ byokProvider }),
      reset: () => set({ ...defaults }),

      setApiKeysInMemory: (apiKeys) => set({ apiKeys: { ...apiKeys } }),
      reloadKeys: async () => {
        try {
          set({ apiKeys: await getAllKeys() });
        } catch {
          set({ apiKeys: { ...EMPTY_PROVIDER_KEYS } });
        }
      },
    }),
    {
      name: "translate-lens-prefs",
      partialize: (s) => ({
        targetLanguage: s.targetLanguage,
        autoDetectSource: s.autoDetectSource,
        byokProvider: s.byokProvider,
      }),
    },
  ),
);

/** Back-compat selector hook matching the old Solid store shape. */
export function usePreferences() {
  const targetLanguage = usePreferencesStore((s) => s.targetLanguage);
  const autoDetectSource = usePreferencesStore((s) => s.autoDetectSource);
  const byokProvider = usePreferencesStore((s) => s.byokProvider);
  const apiKeys = usePreferencesStore((s) => s.apiKeys);
  return {
    preferences: () => ({ targetLanguage, autoDetectSource, byokProvider }),
    apiKeys: () => apiKeys,
    setTargetLanguage: usePreferencesStore((s) => s.setTargetLanguage),
    setAutoDetectSource: usePreferencesStore((s) => s.setAutoDetectSource),
    setByokProvider: usePreferencesStore((s) => s.setByokProvider),
    reset: usePreferencesStore((s) => s.reset),
    setApiKeysInMemory: usePreferencesStore((s) => s.setApiKeysInMemory),
    reloadKeys: usePreferencesStore((s) => s.reloadKeys),
  };
}
