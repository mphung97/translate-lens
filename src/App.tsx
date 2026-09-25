import { useEffect } from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { usePreferencesStore } from "@/stores/preferences";
import Popup from "@/components/Popup";
import ManualInputPanel from "@/components/ManualInputPanel2";
import OcrUploadPanel from "@/components/OcrUploadPanel";
import ResultPanel from "@/components/ResultPanel";
import SettingsPanel from "@/components/ByokSettingsPanel";
import { ROUTES } from "@/constants";
import { readyOcr } from "@/lib/localOcr";

// Once per app load (not per mount): boot init must survive StrictMode
// remounts and route-layout re-renders without double keychain reads.
let didBoot = false;

function Layout() {
  const reloadKeys = usePreferencesStore((s) => s.reloadKeys);

  useEffect(() => {
    if (didBoot) return;
    didBoot = true;
    void reloadKeys();
    // Silent background warm-up; cached launches resolve in <1s.
    // Failures stay silent here — OCR clicks and Splash retry instead.
    void readyOcr().catch(() => null);
  }, [reloadKeys]);

  return (
    <Popup>
      <Outlet />
    </Popup>
  );
}

const rootRoute = createRootRoute({ component: Layout });

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.upload,
  component: OcrUploadPanel,
});

const pasteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.paste,
  component: ManualInputPanel,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.settings,
  component: SettingsPanel,
});

const resultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.result,
  component: ResultPanel,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to={ROUTES.upload} />,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: () => <Navigate to={ROUTES.upload} />,
});

const routeTree = rootRoute.addChildren([
  uploadRoute,
  pasteRoute,
  settingsRoute,
  resultRoute,
  indexRoute,
  notFoundRoute,
]);

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: [ROUTES.upload] }),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
