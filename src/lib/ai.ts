import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createProviderRegistry, type LanguageModel } from "ai";
import { BYOK_PROVIDERS } from "@/constants";
import type { ByokProviderId, ProviderKeys } from "@/lib/secrets";

/** Default text model id for a provider (source of truth: BYOK_PROVIDERS). */
export function defaultModelFor(provider: ByokProviderId): string {
  return BYOK_PROVIDERS.find((p) => p.id === provider)?.models.text ?? "";
}

/**
 * Central provider registry for BYOK keys.
 * The docs use a module-level singleton because keys come from env;
 * BYOK keys arrive at runtime, so the registry is built per call —
 * same `createProviderRegistry` API, only providers with keys included.
 */
export function createByokRegistry(keys: ProviderKeys) {
  return createProviderRegistry({
    ...(keys.groq ? { groq: createGroq({ apiKey: keys.groq }) } : {}),
    ...(keys.openrouter
      ? { openrouter: createOpenRouter({ apiKey: keys.openrouter }) }
      : {}),
  });
}

/** Single-key shortcut for the translate call path. */
export function getLanguageModel(
  provider: ByokProviderId,
  apiKey: string,
  modelId: string = defaultModelFor(provider),
): LanguageModel {
  const keys: ProviderKeys = { groq: null, openrouter: null };
  keys[provider] = apiKey;
  return createByokRegistry(keys).languageModel(`${provider}:${modelId}`);
}
