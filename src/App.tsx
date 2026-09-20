import { MemoryRouter, Navigate, Route } from "@solidjs/router";
import { onMount, type ParentProps } from "solid-js";
import { PreferencesProvider, usePreferences } from "@/stores/preferences";
import { TranslationProvider } from "@/stores/translation";
import Popup from "@/components/Popup";
import ManualInputPanel from "@/components/ManualInputPanel2";
import OcrUploadPanel from "@/components/OcrUploadPanel";
import ResultPanel from "@/components/ResultPanel";
import SettingsPanel from "@/components/ByokSettingsPanel";
import { ROUTES } from "@/constants";
import { readyOcr } from "@/lib/localOcr";

function KeyBootstrapper(props: ParentProps) {
  const prefs = usePreferences();
  onMount(() => {
    void prefs.reloadKeys();
    // Silent background warm-up; cached launches resolve in <1s.
    // Failures stay silent here — OCR clicks and Splash retry instead.
    void readyOcr().catch(() => null);
  });
  return <>{props.children}</>;
}

function App() {
  return (
    <PreferencesProvider>
      <KeyBootstrapper>
        <TranslationProvider>
          <MemoryRouter root={Popup}>
            <Route path={ROUTES.upload} component={OcrUploadPanel} />
            <Route path={ROUTES.paste} component={ManualInputPanel} />
            <Route path={ROUTES.settings} component={SettingsPanel} />
            <Route path={ROUTES.result} component={ResultPanel} />
            <Route
              path="/"
              component={() => <Navigate href={ROUTES.upload} />}
            />
            <Route
              path="*"
              component={() => <Navigate href={ROUTES.upload} />}
            />
          </MemoryRouter>
        </TranslationProvider>
      </KeyBootstrapper>
    </PreferencesProvider>
  );
}

export default App;
