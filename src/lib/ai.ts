import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import type { ByokProviderId } from "@/lib/secrets";

type ModelFactory = (modelId: string) => LanguageModel;

const CLIENTS: Record<ByokProviderId, (apiKey: string) => ModelFactory> = {
  groq: (apiKey) => createGroq({ apiKey }),
  openrouter: (apiKey) => createOpenRouter({ apiKey }),
};

/** Build a language model for the given provider + key + model id. */
export function getModel(
  provider: ByokProviderId,
  apiKey: string,
  modelId: string,
): LanguageModel {
  return CLIENTS[provider](apiKey)(modelId);
}
