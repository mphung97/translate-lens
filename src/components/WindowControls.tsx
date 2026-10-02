import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function WindowControls() {
  const win = getCurrentWindow();

  return (
    <div
      className={cn([
        "fixed top-3 right-3 z-50",
        "flex items-center gap-1",
      ])}
    >
      <button
        type="button"
        onClick={() => win.minimize()}
        className={cn([
          "w-10 h-8",
          "flex items-center justify-center",
          "text-ink/60",
          "hover:bg-ink/10",
          "transition-colors",
          "rounded",
        ])}
        aria-label="Minimize"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => win.close()}
        className={cn([
          "w-10 h-8",
          "flex items-center justify-center",
          "text-ink/60",
          "hover:bg-[#E81123] hover:text-white",
          "transition-colors",
          "rounded",
        ])}
        aria-label="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
