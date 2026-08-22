import { ImageUp, TextCursorInput, WavesHorizontal, Settings } from "lucide-solid";
import { useLocation, useNavigate } from "@solidjs/router";
import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
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

export default function Toolbar() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <DropdownMenuPrimitive>
      <DropdownMenuPrimitive.Trigger
        class={cn([
          "absolute top-3 right-3 z-10", // Layout
          "w-[27px] h-[27px]", // Sizing
          "border-0 rounded-[6px]", // Borders
          "grid place-items-center", // Grid
          "cursor-pointer", // Interactivity
          "bg-main/10 text-ink", // Inactive state
        ])}
      >
        <DropdownMenuPrimitive.Icon>
          <WavesHorizontal class="w-[14px] h-[14px]" />
        </DropdownMenuPrimitive.Icon>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          class={cn([
            "bg-panel border border-main/12",
            "shadow-lg",
            "rounded-[10px]",
            "p-[8px]",
            "min-w-[160px]",
          ])}
        >
          <DropdownMenuPrimitive.Group>
            <DropdownMenuPrimitive.RadioGroup
              value={pathnameToMode(location.pathname)}
              onChange={(value) => {
                if (value) navigate(MODE_ROUTES[value as Mode]);
              }}
              class={cn(["flex flex-col gap-1"])}
            >
              <DropdownMenuPrimitive.RadioItem
                closeOnSelect
                value="upload"
                class={cn([
                  "flex items-center gap-2",
                  "px-[10px] py-[6px]",
                  "text-[12px] font-medium text-main",
                  "cursor-pointer",
                  "outline-none",
                  "hover:bg-main/8",
                  "focus-visible:bg-main/8",
                  "rounded-[6px]",
                  "data-checked:bg-caret/30 data-checked:font-semibold",
                ])}
              >
                <ImageUp class="w-[14px] h-[14px]" />
                Image
              </DropdownMenuPrimitive.RadioItem>
              <DropdownMenuPrimitive.RadioItem
                closeOnSelect
                value="paste"
                class={cn([
                  "flex items-center gap-2",
                  "px-[10px] py-[6px]",
                  "text-[12px] font-medium text-main",
                  "cursor-pointer",
                  "outline-none",
                  "hover:bg-main/8",
                  "focus-visible:bg-main/8",
                  "rounded-[6px]",
                  "data-checked:bg-caret/30 data-checked:font-semibold",
                ])}
              >
                <TextCursorInput class="w-[14px] h-[14px]" />
                Input
              </DropdownMenuPrimitive.RadioItem>
              <DropdownMenuPrimitive.RadioItem
                closeOnSelect
                value="settings"
                class={cn([
                  "flex items-center gap-2",
                  "px-[10px] py-[6px]",
                  "text-[12px] font-medium text-main",
                  "cursor-pointer",
                  "outline-none",
                  "hover:bg-main/8",
                  "focus-visible:bg-main/8",
                  "rounded-[6px]",
                  "data-checked:bg-caret/30 data-checked:font-semibold",
                ])}
              >
                <Settings class="w-[14px] h-[14px]" />
                Settings
              </DropdownMenuPrimitive.RadioItem>
            </DropdownMenuPrimitive.RadioGroup>
          </DropdownMenuPrimitive.Group>

          <DropdownMenuPrimitive.Arrow />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive>
  );
}
