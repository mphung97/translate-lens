import { useEffect, useRef, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { MAX_WINDOW_HEIGHT } from "@/constants";
import { resizeWindow, setupAutoResize } from "@/lib/resizeWindow";
import { USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import Toolbar from "./Toolbar";
import Splash from "./Splash";
import { WindowControls } from "./WindowControls";

export type Mode = "upload" | "paste" | "settings";

export default function Popup(props: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Resize the window per panel on route changes.
    queueMicrotask(() => resizeWindow(panelRef.current ?? undefined));
  }, [pathname]);

  useEffect(() => {
    if (!panelRef.current) return;
    const disconnect = setupAutoResize(panelRef.current);
    return () => disconnect?.();
  }, []);

  return (
    <div
      ref={panelRef}
      style={{ maxHeight: `${MAX_WINDOW_HEIGHT}px` }}
      className={cn([
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
      <div className="flex items-center h-10 absolute top-0 left-0 right-0">
        <div
          className="flex-1 h-full bg-[linear-gradient(to_right,#EF9393,#E17DC2,#998EE0,#43ADD0,#8BDEDA)]"
          data-tauri-drag-region="true"
        />
        {USE_CUSTOM_WINDOW_CONTROLS && <WindowControls />}
      </div>
      <div
        className={cn([
          "relative", // Layout
          "flex flex-col flex-1 min-h-0", // Layout
          "overflow-y-auto no-scrollbar", // Layout
          "p-3", // Spacing
          "bg-bg", // Backgrounds
          "rounded-[10px]", // Borders
        ])}
      >
        <Toolbar />
        <Splash>{props.children}</Splash>
      </div>
    </div>
  );
}
