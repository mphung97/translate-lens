import type { ByokProviderId } from "./lib/secrets";

export type AppMode = "upload" | "paste" | "settings";
export const DEFAULT_TARGET_LANGUAGE = "vietnamese";
export const DEFAULT_MODE: AppMode = "upload";

export const ROUTES = {
  upload: "/upload",
  paste: "/paste",
  settings: "/settings",
  result: "/result",
} as const;

export const MAX_INPUT_CHARS = 2000;
export const MAX_UPLOAD_FILES = 5;
export const COPY_RESET_DELAY_MS = 1500;
export const TEXTAREA_ROWS = 5;

export const OCR_MAX_LONG_EDGE = 1536;
export const OCR_JPEG_QUALITY = 0.82;
export const OCR_SMALL_PNG_CUTOFF = 800;
export const OCR_TINY_UPSCALE_CUTOFF = 400;
export const OCR_JPEG_FALLBACK_BYTES = 500 * 1024;

export const OCR_MIN_SCORE = 0.7;

export const WINDOW_WIDTH = 500;
export const MAX_WINDOW_HEIGHT = 700;

export const FALLBACK_TRANSLATE_ERROR = "Translation failed";
export const FALLBACK_CLIPBOARD_IMAGE_ERROR =
  "Failed to read or translate clipboard image";
export const FALLBACK_UPLOAD_ERROR =
  "Failed to read or translate uploaded image";

export const MANUAL_INPUT_PLACEHOLDER = "Type or paste text to translate…";

export interface LanguageOption {
  value: string;
  label: string;
}

export const BYOK_LANGUAGES: LanguageOption[] = [
  { value: "vietnamese", label: "🇻🇳 Tiếng Việt (VI)" },
  { value: "english", label: "🇺🇸 English (EN)" },
  { value: "japanese", label: "🇯🇵 日本語 (JA)" },
  { value: "korean", label: "🇰🇷 한국어 (KO)" },
  { value: "french", label: "🇫🇷 Français (FR)" },
];

export interface ByokProvider {
  id: ByokProviderId;
  label: string;
  models: {
    text: string;
    image: string;
  };
  note: string;
}

export const BYOK_PROVIDERS: readonly ByokProvider[] = [
  {
    id: "groq",
    label: "Groq",
    models: { text: "openai/gpt-oss-120b", image: "qwen/qwen3.8-27b" },
    note: "",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    models: { text: "qwen/qwen-3-32b", image: "qwen/qwen2.5-vl-32b-instruct" },
    note: "",
  },
];

export const DEFAULT_BYOK_PROVIDER: ByokProviderId = "groq";

export const IDLE_BYOK_STATUS = { kind: "idle", msg: "" } as const;
