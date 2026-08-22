import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { MAX_WINDOW_HEIGHT, WINDOW_WIDTH } from "@/constants";

const appWindow = getCurrentWindow();
let lastHeight = 0;

export async function resizeWindow(container?: HTMLElement) {
  const el = container ?? document.body;
  const height = el.getBoundingClientRect().height;
  if (height === lastHeight || height === 0) return;
  lastHeight = height;
  await appWindow.setSize(
    new LogicalSize(WINDOW_WIDTH, Math.min(height, MAX_WINDOW_HEIGHT)),
  );
}

export function setupAutoResize(container: HTMLElement): () => void {
  const observer = new ResizeObserver(() => resizeWindow(container));
  observer.observe(container);
  return () => observer.disconnect();
}
