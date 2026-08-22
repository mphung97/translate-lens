import { createContext, useContext, type ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import type { TranslateResult } from "@/lib/translate";

export type TranslationOrigin = "upload" | "paste";

export interface Translation {
  result: TranslateResult | null;
  origin: TranslationOrigin;
}

interface TranslationStore {
  translation: Translation;
  setTranslationResult: (result: TranslateResult, origin: TranslationOrigin) => void;
}

const TranslationContext = createContext<TranslationStore>();

export const TranslationProvider: ParentComponent = (props) => {
  const [translation, setTranslation] = createStore<Translation>({
    result: null,
    origin: "upload",
  });

  const store: TranslationStore = {
    translation,
    setTranslationResult: (result, origin) => setTranslation({ result, origin }),
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
