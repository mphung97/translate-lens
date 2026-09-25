import { create } from "zustand";
import type { TranslateResult } from "@/lib/translate";

export type TranslationOrigin = "upload" | "paste";

export interface Translation {
  result: TranslateResult | null;
  origin: TranslationOrigin;
  /** Local OCR mean line confidence (0..1). Null for paste path. */
  ocrScore: number | null;
}

interface TranslationState {
  translation: Translation;
  setTranslationResult: (
    result: TranslateResult,
    origin: TranslationOrigin,
    ocrScore?: number | null,
  ) => void;
  clearTranslation: () => void;
}

export const useTranslationStore = create<TranslationState>()((set) => ({
  translation: { result: null, origin: "upload", ocrScore: null },
  setTranslationResult: (result, origin, ocrScore = null) =>
    set({ translation: { result, origin, ocrScore } }),
  clearTranslation: () =>
    set({ translation: { result: null, origin: "upload", ocrScore: null } }),
}));

/** Back-compat hook matching the old Solid store shape. */
export function useTranslation() {
  const translation = useTranslationStore((s) => s.translation);
  const setTranslationResult = useTranslationStore((s) => s.setTranslationResult);
  return { translation, setTranslationResult };
}
