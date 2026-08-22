import { generateText, Output, type ModelMessage } from "ai";
import { z } from "zod";
import { DEFAULT_TARGET_LANGUAGE, BYOK_PROVIDERS } from "@/constants";
import type { ByokProviderId, ProviderKeys } from "@/lib/secrets";
import { getModel } from "@/lib/ai";

const translateSchema = z.object({
  detectedLanguage: z
    .string()
    .describe("Detected input language, e.g. 'chinese', 'english', 'japanese'"),
  detectedText: z
    .string()
    .describe(
      "The original text detected in the input (verbatim transcription / OCR result), not the translation",
    ),
  translatedText: z
    .string()
    .describe("The translated text in the target language"),
  pinyin: z
    .string()
    .describe(
      "Pinyin of the input text. Only provide when input language is Chinese, otherwise set to empty string",
    ),
});

export type TranslateResult = z.infer<typeof translateSchema>;

interface TranslateInput {
  text?: string;
  imageData?: Uint8Array;
  targetLanguage?: string;
  provider: ByokProviderId;
  apiKey: string;
  model?: string;
}

export class TranslateError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "EMPTY_INPUT"
      | "MISSING_KEY"
      | "API_ERROR"
      | "INVALID_RESPONSE"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "TranslateError";
  }
}

function defaultModelFor(provider: ByokProviderId, isImage: boolean): string {
  const models = BYOK_PROVIDERS.find((p) => p.id === provider)?.models;
  return isImage ? (models?.image ?? "") : (models?.text ?? "");
}

function missingKeyError(provider: ByokProviderId): TranslateError {
  return new TranslateError(
    `Chưa có API key cho ${provider} — mở Settings để thêm key`,
    "MISSING_KEY",
  );
}

function emptyResult(text: string): TranslateResult {
  return {
    detectedLanguage: "unknown",
    detectedText: text,
    translatedText: text,
    pinyin: "",
  };
}

/**
 * Look up the BYOK key for a provider from the memory-loaded keys.
 * Pure — no keychain access. Throws MISSING_KEY when absent.
 */
export function resolveCredentials(keys: ProviderKeys, provider: ByokProviderId) {
  const apiKey = keys[provider];
  if (!apiKey) throw missingKeyError(provider);
  return { apiKey };
}

function buildInstructions(targetLanguage: string, isImage: boolean): string {
  const detectedTextRule = isImage
    ? "Set detectedText to the full verbatim transcription (OCR result) of all visible text in the image."
    : "Set detectedText to the original input text verbatim (after trimming).";
  return `You are a professional translator. Translate ${isImage ? "all visible text in this image" : "text"} into ${targetLanguage}.

Rules:
1. Detect the input language accurately.
2. ${detectedTextRule}
3. Provide an accurate and natural translation.
4. If the detected language is "chinese", include the pinyin of the ORIGINAL input text (not the translation).
5. If you cannot determine the input language, set detectedLanguage to "unknown" and translatedText to the original text.
6. Always respond in the exact JSON format specified.`;
}

export async function translate({
  text,
  imageData,
  targetLanguage = DEFAULT_TARGET_LANGUAGE,
  provider,
  apiKey,
  model,
}: TranslateInput): Promise<TranslateResult> {
  if (!apiKey) throw missingKeyError(provider);

  const isImage = imageData !== undefined;
  let messages: ModelMessage[];
  let fallbackText: string;
  let errorLabel: string;

  if (isImage) {
    if (imageData.length === 0) {
      throw new TranslateError("Image data is empty", "EMPTY_INPUT");
    }
    messages = [
      {
        role: "user",
        content: [
          { type: "text", text: "Translate the text in this image." },
          { type: "file", mediaType: "image/png", data: imageData },
        ],
      },
    ];
    fallbackText = "";
    errorLabel = "Image translation failed";
  } else {
    const trimmed = (text ?? "").trim();
    if (!trimmed) {
      throw new TranslateError("Input text is empty", "EMPTY_INPUT");
    }
    messages = [{ role: "user", content: [{ type: "text", text: trimmed }] }];
    fallbackText = trimmed;
    errorLabel = "Translation failed";
  }

  try {
    const { output } = await generateText({
      model: getModel(
        provider,
        apiKey,
        model ?? defaultModelFor(provider, isImage),
      ),
      output: Output.object({ schema: translateSchema }),
      instructions: buildInstructions(targetLanguage, isImage),
      messages,
    });

    if (!output) return emptyResult(fallbackText);

    const parsed = translateSchema.safeParse(output);
    if (!parsed.success) return emptyResult(fallbackText);

    return parsed.data;
  } catch (error) {
    if (error instanceof TranslateError) throw error;
    throw new TranslateError(
      error instanceof Error ? error.message : errorLabel,
      "API_ERROR",
    );
  }
}
