import { ImageUp, TextCursorInput, Settings } from "lucide-solid";
import { useLocation, useNavigate } from "@solidjs/router";
import { SegmentedControl } from "@kobalte/core/segmented-control";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import type { Mode } from "./Popup";

function pathnameToMode(pathname: string): Mode | undefined {
  if (pathname.startsWith(ROUTES.settings)) return "settings";
  if (pathname.startsWith(ROUTES.paste)) return "paste";
  if (pathname.startsWith(ROUTES.upload)) return "upload";
  return undefined;
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
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <SegmentedControl
      value={pathnameToMode(location.pathname) ?? "upload"}
      onChange={(value) => {
        if (value) navigate(MODE_ROUTES[value as Mode]);
      }}
      class={cn([
        "w-max",
        "mb-3"
      ])}
    >
      <div
        role="presentation"
        class={cn([
          "relative", // Layout
          "bg-panel", // Backgrounds
          "rounded-[10px]", // Borders
          "shadow-sm"
        ])}
      >
        <SegmentedControl.Indicator
          class={cn([
            "absolute left-0 top-0", // Layout
            "bg-caret/30 rounded-[8px]", // Backgrounds + Borders
            "transition-[transform,width,height] duration-200 ease-out", // Transitions
          ])}
        />
        <div
          role="presentation"
          class={cn([
            "relative", // Layout
            "flex items-center", // Flexbox
            "p-0", // Spacing
          ])}
        >
          {MODES.map(({ value, label, Icon }) => (
            <SegmentedControl.Item
              value={value}
              class={cn([
                "relative", // Layout
              ])}
            >
              <SegmentedControl.ItemInput aria-label={label} class="peer" />
              <SegmentedControl.ItemLabel
                title={label}
                class={cn([
                  "relative", // Layout
                  "grid place-items-center", // Grid
                  "size-[27px]", // Sizing
                  "rounded-[8px]", // Borders
                  "text-ink", // Typography
                  "transition-colors duration-200", // Transitions
                  "cursor-pointer", // Interactivity
                  "hover:text-main", // Interactivity
                  "peer-focus-visible:outline-none peer-focus-visible:ring-1 peer-focus-visible:ring-caret", // Interactivity
                  "data-[checked]:text-main", // Checked state
                ])}
              >
                <Icon class="w-[14px] h-[14px]" />
              </SegmentedControl.ItemLabel>
            </SegmentedControl.Item>
          ))}
        </div>
      </div>
    </SegmentedControl>
  );
}
