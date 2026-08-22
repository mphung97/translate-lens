import { invoke } from "@tauri-apps/api/core";

export const KEYRING_SERVICE = "translate-lens";

export type ByokProviderId = "groq" | "openrouter";

export const BYOK_PROVIDER_IDS: readonly ByokProviderId[] = [
  "groq",
  "openrouter",
] as const;

export type ProviderKeys = Record<ByokProviderId, string | null>;

export const EMPTY_PROVIDER_KEYS: ProviderKeys = {
  groq: null,
  openrouter: null,
};

function account(provider: ByokProviderId): string {
  return `byok-${provider}-api-key`;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function lsGet(provider: ByokProviderId): string | null {
  try {
    const v = localStorage.getItem(`byok:${provider}`);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function lsSet(provider: ByokProviderId, key: string): void {
  try {
    localStorage.setItem(`byok:${provider}`, key);
  } catch {}
}

function lsClear(provider: ByokProviderId): void {
  try {
    localStorage.removeItem(`byok:${provider}`);
  } catch {}
}

export async function getKey(provider: ByokProviderId): Promise<string | null> {
  if (!isTauri()) return lsGet(provider);
  try {
    const v = await invoke<string | null>("secrets_get", {
      service: KEYRING_SERVICE,
      account: account(provider),
    });
    return v && v.length > 0 ? v : null;
  } catch {
    return lsGet(provider);
  }
}

export async function setKey(provider: ByokProviderId, key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("API key is empty");
  if (!isTauri()) {
    lsSet(provider, trimmed);
    return;
  }
  try {
    await invoke("secrets_set", {
      service: KEYRING_SERVICE,
      account: account(provider),
      password: trimmed,
    });
  } catch {
    lsSet(provider, trimmed);
  }
}

export async function clearKey(provider: ByokProviderId): Promise<void> {
  lsClear(provider);
  if (!isTauri()) return;
  try {
    await invoke("secrets_delete", {
      service: KEYRING_SERVICE,
      account: account(provider),
    });
  } catch {
    // already absent — fine
  }
}

export async function getAllKeys(): Promise<ProviderKeys> {
  const out = { ...EMPTY_PROVIDER_KEYS };
  if (!isTauri()) {
    for (const id of BYOK_PROVIDER_IDS) out[id] = lsGet(id);
    return out;
  }
  try {
    const results = await invoke<(string | null)[]>("secrets_get_all", {
      service: KEYRING_SERVICE,
      accounts: BYOK_PROVIDER_IDS.map(account),
    });
    BYOK_PROVIDER_IDS.forEach((id, i) => {
      const v = results[i];
      out[id] = v && v.length > 0 ? v : null;
    });
    return out;
  } catch {
    for (const id of BYOK_PROVIDER_IDS) out[id] = await getKey(id);
    return out;
  }
}

export function hasKey(keys: ProviderKeys, provider: ByokProviderId): boolean {
  return !!keys[provider];
}
