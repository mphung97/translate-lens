import { getCurrentWindow } from "@tauri-apps/api/window";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Apply always-on-top to the current window. No-op outside Tauri. */
export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().setAlwaysOnTop(enabled);
}

/** Read the live always-on-top state. False outside Tauri. */
export async function isAlwaysOnTop(): Promise<boolean> {
  if (!isTauri()) return false;
  return getCurrentWindow().isAlwaysOnTop();
}
