import { ImageUp, TextCursorInput, Settings } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import type { Mode } from "./Popup";

function pathnameToMode(pathname: string): Mode {
  if (pathname.startsWith(ROUTES.settings)) return "settings";
  if (pathname.startsWith(ROUTES.paste)) return "paste";
  return "upload";
}

const MODE_ROUTES: Record<Mode, string> = {
  upload: ROUTES.upload,
  paste: ROUTES.paste,
  settings: ROUTES.settings,
};

const MODES: { value: Mode; label: string; Icon: typeof ImageUp }[] = [
  { value: "upload", label: "Image", Icon: ImageUp },
  { value: "paste", label: "Input", Icon: TextCursorInput },
  { value: "settings", label: "Settings", Icon: Settings },
];

export default function Toolbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const active = pathnameToMode(pathname);

  return (
    <div className={cn(["w-max", "mb-3"])}>
      <div
        role="presentation"
        className={cn([
          "relative", // Layout
          "bg-panel", // Backgrounds
          "rounded-[10px]", // Borders
          // "shadow-sm",
        ])}
      >
        <div
          role="presentation"
          className={cn([
            "relative", // Layout
            "flex items-center", // Flexbox
            "p-0", // Spacing
          ])}
        >
          {MODES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={value === active}
              onClick={() => navigate({ to: MODE_ROUTES[value] })}
              className={cn([
                "relative", // Layout
                "grid place-items-center", // Grid
                "size-[27px]", // Sizing
                "rounded-[8px]", // Borders
                "text-ink", // Typography
                "transition-colors duration-200", // Transitions
                "cursor-pointer", // Interactivity
                "border-0 bg-transparent", // Reset
                "hover:text-main", // Interactivity
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-caret", // Interactivity
                value === active && "bg-caret/30 text-main", // Active state
              ])}
            >
              <Icon className="w-[14px] h-[14px]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
