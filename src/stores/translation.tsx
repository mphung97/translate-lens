import { createContext, useContext, type ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import type { TranslateResult } from "@/lib/translate";

export type TranslationOrigin = "upload" | "paste";

export type OcrSource = "local" | "cloud" | null;

export interface Translation {
  result: TranslateResult | null;
  origin: TranslationOrigin;
  ocrSource: OcrSource;
  /** Local OCR mean line confidence (0..1). Null for cloud/paste paths. */
  ocrScore: number | null;
}

interface TranslationStore {
  translation: Translation;
  setTranslationResult: (
    result: TranslateResult,
    origin: TranslationOrigin,
    ocrSource?: OcrSource,
    ocrScore?: number | null,
  ) => void;
}

const TranslationContext = createContext<TranslationStore>();

export const TranslationProvider: ParentComponent = (props) => {
  const [translation, setTranslation] = createStore<Translation>({
    result: null,
    origin: "upload",
    ocrSource: null,
    ocrScore: null,
  });

  const store: TranslationStore = {
    translation,
    setTranslationResult: (result, origin, ocrSource = null, ocrScore = null) =>
      setTranslation({ result, origin, ocrSource, ocrScore }),
  };

  return (
    <TranslationContext.Provider value={store}>
      {props.children}
    </TranslationContext.Provider>
  );
};

export function useTranslation(): TranslationStore {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error("useTranslation must be used within TranslationProvider");
  return ctx;
}
