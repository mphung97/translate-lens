import {
  createContext,
  useContext,
  createSignal,
  type Accessor,
  type ParentComponent,
} from "solid-js";
import type { ByokProviderId, ProviderKeys } from "@/lib/secrets";
import { EMPTY_PROVIDER_KEYS, getAllKeys } from "@/lib/secrets";

export interface Preferences {
  targetLanguage: string;
  autoDetectSource: boolean;
  byokProvider: ByokProviderId;
}

const STORAGE_KEY = "translate-lens-prefs";

const defaults: Preferences = {
  targetLanguage: "vietnamese",
  autoDetectSource: true,
  byokProvider: "groq",
};

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return { ...defaults };
}

function savePreferences(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

function resolveValue<T>(v: T | ((prev: T) => T), prev: T): T {
  if (typeof v === "function") return (v as (prev: T) => T)(prev);
  return v;
}

export type ValueOrUpdater<T> = T | ((prev: T) => T);

interface PreferencesStore {
  preferences: Accessor<Preferences>;
  setTargetLanguage: (v: ValueOrUpdater<string>) => void;
  setAutoDetectSource: (v: ValueOrUpdater<boolean>) => void;
  setByokProvider: (v: ByokProviderId) => void;
  reset: () => void;
  /** BYOK keys, memory-only (never persisted). Loaded once at boot. */
  apiKeys: Accessor<ProviderKeys>;
  setApiKeysInMemory: (keys: ProviderKeys) => void;
  reloadKeys: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesStore>();

export const PreferencesProvider: ParentComponent = (props) => {
  const [preferences, setPreferences] = createSignal<Preferences>(loadPreferences());
  const [apiKeys, setApiKeys] = createSignal<ProviderKeys>(EMPTY_PROVIDER_KEYS);

  async function reloadKeys() {
    try {
      setApiKeys(await getAllKeys());
    } catch {
      setApiKeys({ ...EMPTY_PROVIDER_KEYS });
    }
  }

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      savePreferences(next);
      return next;
    });
  }

  const store: PreferencesStore = {
    preferences,
    setTargetLanguage: (v) => update("targetLanguage", resolveValue(v, preferences().targetLanguage)),
    setAutoDetectSource: (v) => update("autoDetectSource", resolveValue(v, preferences().autoDetectSource)),
    setByokProvider: (v) => update("byokProvider", v),
    reset: () => {
      setPreferences({ ...defaults });
      savePreferences({ ...defaults });
    },
    apiKeys,
    setApiKeysInMemory: (keys) => setApiKeys({ ...keys }),
    reloadKeys,
  };

  return (
    <PreferencesContext.Provider value={store}>
      {props.children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences(): PreferencesStore {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
