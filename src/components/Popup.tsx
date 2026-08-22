import {
  createEffect,
  onMount,
  onCleanup,
  type ParentProps,
} from "solid-js";
import { useLocation } from "@solidjs/router";
import { cn } from "@/lib/utils";
import { MAX_WINDOW_HEIGHT } from "@/constants";
import { resizeWindow, setupAutoResize } from "@/lib/resizeWindow";
import Toolbar from "./Toolbar";

export type Mode = "upload" | "paste" | "settings";

export default function Popup(props: ParentProps) {
  const location = useLocation();
  let panelRef: HTMLDivElement | undefined;

  createEffect(() => {
    // Subscribe to route changes so the window resizes per panel.
    location.pathname;
    queueMicrotask(() => resizeWindow(panelRef));
  });

  let disconnect: (() => void) | undefined;
  onMount(() => {
    if (panelRef) {
      disconnect = setupAutoResize(panelRef);
    }
  });

  onCleanup(() => disconnect?.());

  return (
    <>
      <div
        ref={panelRef}
        style={{ "max-height": `${MAX_WINDOW_HEIGHT}px` }}
        class={cn([
          "relative", // Layout
          "flex flex-col", // Layout
          "overflow-hidden", // Layout
          "w-full h-full", // Sizing
          "font-mono", // Typography
          "border-0 rounded-[10px]", // Borders
          "bg-[linear-gradient(to_right,#EF9393,#E17DC2,#998EE0,#43ADD0,#8BDEDA)]", // Backgrounds
          "p-2 pt-10", // Spacing
        ])}
      >
        <div
          class="absolute top-0 left-0 w-full h-10 bg-[linear-gradient(to_right,#EF9393,#E17DC2,#998EE0,#43ADD0,#8BDEDA)]"
          data-tauri-drag-region
        />
        <div
          class={cn([
            "relative", // Layout
            "flex flex-col flex-1 min-h-0", // Layout
            "overflow-y-auto no-scrollbar", // Layout
            "p-3", // Spacing
            "bg-bg", // Backgrounds
            "rounded-[10px]", // Borders
          ])}
        >
          <Toolbar />
          {props.children}
        </div>
      </div>
    </>
  );
}
