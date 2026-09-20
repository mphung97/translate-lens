import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface UpdateCheck {
  available: boolean;
  version?: string;
}

/** Current app version. Falls back to "0.1.0" outside Tauri (browser dev). */
export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return "0.1.0";
  try {
    return await getVersion();
  } catch {
    return "0.1.0";
  }
}

/** Check for an available update. Never throws — returns `{ available: false }` on error. */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!isTauri()) return { available: false };
  try {
    const update = await check();
    if (!update) return { available: false };
    return { available: true, version: update.version };
  } catch {
    return { available: false };
  }
}

/** Download, install and relaunch. Returns false when no update is available. */
export async function installAndRelaunch(): Promise<boolean> {
  const update = await check();
  if (!update) return false;
  await update.downloadAndInstall();
  await relaunch();
  return true;
}
