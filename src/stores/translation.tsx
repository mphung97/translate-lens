import { createContext, useContext, type ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import type { TranslateResult } from "@/lib/translate";

export type TranslationOrigin = "upload" | "paste";

export interface Translation {
  result: TranslateResult | null;
  origin: TranslationOrigin;
  /** Local OCR mean line confidence (0..1). Null for paste path. */
  ocrScore: number | null;
}

interface TranslationStore {
  translation: Translation;
  setTranslationResult: (
    result: TranslateResult,
    origin: TranslationOrigin,
    ocrScore?: number | null,
  ) => void;
}

const TranslationContext = createContext<TranslationStore>();

export const TranslationProvider: ParentComponent = (props) => {
  const [translation, setTranslation] = createStore<Translation>({
    result: null,
    origin: "upload",
    ocrScore: null,
  });

  const store: TranslationStore = {
    translation,
    setTranslationResult: (result, origin, ocrScore = null) =>
      setTranslation({ result, origin, ocrScore }),
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
