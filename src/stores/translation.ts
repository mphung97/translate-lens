import { create } from "zustand";
import type { LocalOcrBox } from "@/lib/localOcr";
import type { TranslateResult } from "@/lib/translate";

export type TranslationOrigin = "upload" | "paste";

export interface Translation {
  result: TranslateResult | null;
  origin: TranslationOrigin;
  /** Local OCR mean line confidence (0..1). Null for paste path. */
  ocrScore: number | null;
  /** OCR boxes for the text-panel proof view. Null for paste path. */
  ocrBoxes: LocalOcrBox[] | null;
}

interface TranslationState {
  translation: Translation;
  setTranslationResult: (
    result: TranslateResult,
    origin: TranslationOrigin,
    ocrScore?: number | null,
    ocrBoxes?: LocalOcrBox[] | null,
  ) => void;
  clearTranslation: () => void;
}

export const useTranslationStore = create<TranslationState>()((set) => ({
  translation: { result: null, origin: "upload", ocrScore: null, ocrBoxes: null },
  setTranslationResult: (result, origin, ocrScore = null, ocrBoxes = null) =>
    set({ translation: { result, origin, ocrScore, ocrBoxes } }),
  clearTranslation: () =>
    set({ translation: { result: null, origin: "upload", ocrScore: null, ocrBoxes: null } }),
}));

/** Back-compat hook matching the old Solid store shape. */
export function useTranslation() {
  const translation = useTranslationStore((s) => s.translation);
  const setTranslationResult = useTranslationStore((s) => s.setTranslationResult);
  return { translation, setTranslationResult };
}
