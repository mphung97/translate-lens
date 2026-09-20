import { readImage } from "@tauri-apps/plugin-clipboard-manager";

export interface ClipboardImageSize {
  w: number;
  h: number;
}

/**
 * Lightweight clipboard image probe: size check only.
 * Returns dimensions on success, null when clipboard is empty/invalid.
 * Never throws; probe path stays silent (no error toast).
 */
export async function checkClipboardImage(): Promise<ClipboardImageSize | null> {
  try {
    const image = await readImage();
    const size = await image.size();
    if (size.width <= 0 || size.height <= 0) return null;
    return { w: size.width, h: size.height };
  } catch {
    return null;
  }
}
