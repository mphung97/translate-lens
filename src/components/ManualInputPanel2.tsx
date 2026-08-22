import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { createStore } from "solid-js/store";
import * as Switch from "@kobalte/core/switch";
import {
  ClipboardPaste,
  X,
  ChevronRight,
  RotateCcw,
  Settings2,
} from "lucide-solid";
import { cn } from "@/lib/utils";
import { resolveCredentials, translate, TranslateError } from "@/lib/translate";
import { usePreferences } from "@/stores/preferences";
import { useTranslation } from "@/stores/translation";
import Badge from "./Badge";
import {
  FALLBACK_TRANSLATE_ERROR,
  MAX_INPUT_CHARS,
  ROUTES,
  TEXTAREA_ROWS,
} from "@/constants";

interface ManualInputState {
  input: string;
  showPinyin: boolean;
  showRuby: boolean;
  busy: boolean;
  error: string;
}

export default function ManualInputPanel() {
  const prefs = usePreferences();
  const t = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = createStore<ManualInputState>({
    input: "",
    showPinyin: true,
    showRuby: false,
    busy: false,
    error: "",
  });

  const charCount = () => state.input.length;
  const maxChars = MAX_INPUT_CHARS;

  function editInput(v: string) {
    setState({ input: v, error: "" });
  }

  function clearInput() {
    setState({ input: "", error: "" });
  }

  async function pasteFromClipboard() {
    try {
      let text = "";
      if ("__TAURI_INTERNALS__" in window) {
        const { readText } = await import(
          "@tauri-apps/plugin-clipboard-manager"
        );
        text = (await readText()) ?? "";
      } else if (navigator.clipboard) {
        text = await navigator.clipboard.readText();
      }
      if (text) editInput(state.input + text);
    } catch {
      setState({ error: "Không đọc được nội dung clipboard" });
    }
  }

  async function submit() {
    const text = state.input.trim();
    if (!text || state.busy) return;
    setState({ busy: true, error: "" });
    try {
      const provider = prefs.preferences().byokProvider;
      const { apiKey } = resolveCredentials(prefs.apiKeys(), provider);
      const result = await translate({
        text,
        targetLanguage: prefs.preferences().targetLanguage,
        provider,
        apiKey,
      });
      t.setTranslationResult(result, "paste");
      navigate(ROUTES.result);
    } catch (e) {
      setState({
        error:
          e instanceof TranslateError ? e.message : FALLBACK_TRANSLATE_ERROR,
      });
    } finally {
      setState({ busy: false });
    }
  }

  return (
    <div
      class={cn([
        "relative", // Layout
        "flex flex-col", // Flexbox
        "bg-bg", // Backgrounds
      ])}
    >
      {/* Status Row */}
      <div
        class={cn([
          "flex items-center justify-between", // Flexbox
          "mb-3", // Spacing
        ])}
      >
        <div
          class={cn([
            "flex items-center gap-[6px]", // Flexbox + Spacing
          ])}
        >
          <Badge variant="success" dot>
            Manual Mode
          </Badge>
          <Badge>Auto Detect ZH</Badge>
          <Badge>
            ZH
            <ChevronRight class="w-2 h-2" />
            VI
          </Badge>
        </div>
      </div>

      {/* Input Panel */}
      <div
        class={cn([
          "relative", // Layout
          "bg-panel border border-main/10", // Backgrounds + Borders
          "rounded-[12px]", // Borders
          "p-[14px] pb-[12px]", // Spacing
          "shadow-inner shadow-main/5", // Effects
        ])}
      >
        <div
          class={cn([
            "min-h-[126px]", // Sizing
          ])}
        >
          <textarea
            class={cn([
              "w-full h-full", // Sizing
              "border-0 bg-transparent", // Borders + Backgrounds
              "font-mono text-[14px] leading-[1.7]", // Typography
              "text-main", // Typography (color)
              "resize-none outline-none", // Interactivity
              "placeholder:text-ink placeholder:opacity-75", // Placeholder
            ])}
            placeholder={
              "Nhập chữ Hán, câu từ hoặc dán đoạn văn bản cần dịch tại đây...\nVí dụ: 学而时习之，不亦说乎？"
            }
            value={state.input}
            onInput={(e) => editInput(e.currentTarget.value)}
            rows={TEXTAREA_ROWS}
          />
        </div>

        {/* Input Tools */}
        <div
          class={cn([
            "flex items-center justify-between", // Flexbox
            "pt-[10px] mt-[6px]", // Spacing
            "border-t border-dashed border-main/10", // Borders
          ])}
        >
          <span
            class={cn([
              "text-[10px] font-medium", // Typography
              "text-ink tracking-[.02em]", // Typography (color)
            ])}
          >
            {charCount().toLocaleString()} / {maxChars.toLocaleString()} ký tự
          </span>

          <div
            class={cn([
              "flex items-center gap-[6px]", // Flexbox + Spacing
            ])}
          >
            <button
              onClick={pasteFromClipboard}
              class={cn([
                "font-mono text-[10px] font-medium", // Typography
                "text-ink", // Typography (color)
                "bg-main/5", // Backgrounds
                "border border-main/6", // Borders
                "rounded-[6px]", // Borders
                "px-[7px] py-[3px]", // Spacing
                "inline-flex items-center gap-1", // Layout + Flexbox + Spacing
                "cursor-pointer", // Interactivity
                "transition-colors", // Transitions
                "hover:bg-main/10 hover:text-main", // Interactivity
              ])}
              title="Paste from Clipboard (⌘V)"
            >
              <ClipboardPaste class="w-[11px] h-[11px]" />
              Dán nhanh
            </button>
            <button
              onClick={clearInput}
              class={cn([
                "font-mono text-[10px] font-medium", // Typography
                "text-ink", // Typography (color)
                "bg-main/5", // Backgrounds
                "border border-main/6", // Borders
                "rounded-[6px]", // Borders
                "px-[7px] py-[3px]", // Spacing
                "inline-flex items-center gap-1", // Layout + Flexbox + Spacing
                "cursor-pointer", // Interactivity
                "transition-colors", // Transitions
                "hover:bg-main/10 hover:text-main", // Interactivity
              ])}
              title="Clear"
            >
              <X class="w-[11px] h-[11px]" />
              Xóa
            </button>
          </div>
        </div>
      </div>

      {/* Options Drawer */}
      {/*<div
        class={cn([
          "mt-3", // Spacing
          "bg-main/[.02] border border-main/6", // Backgrounds + Borders
          "rounded-[10px]", // Borders
          "px-[12px] py-[10px]", // Spacing
          "flex items-center justify-between", // Flexbox
        ])}
      >
        <div class="flex items-center gap-2">
          <Settings2 class="w-[12px] h-[12px] text-ink" />
          <span class="font-mono text-[10.5px] font-medium text-ink">
            Tùy chọn
          </span>
        </div>

        <div class="flex items-center gap-4">
          <Switch.Root
            class="flex items-center gap-2 cursor-pointer"
            checked={showPinyin()}
            onChange={setShowPinyin}
          >
            <Switch.Label class="font-mono text-[10.5px] font-medium text-ink">
              Pinyin
            </Switch.Label>
            <Switch.Control
              class={cn([
                "w-[30px] h-[17px]", // Sizing
                "rounded-full", // Borders
                "relative", // Layout
                "transition-colors", // Transitions
                showPinyin() ? "bg-caret" : "bg-sub-alt",
              ])}
            >
              <Switch.Thumb
                class={cn([
                  "absolute top-[2px] w-[13px] h-[13px]", // Positioning + Sizing
                  "rounded-full", // Borders
                  "bg-white", // Backgrounds
                  "shadow-[0_1px_2px_rgba(0,0,0,.2)]", // Effects
                  "transition-[left]", // Transitions
                  showPinyin() ? "left-[15px]" : "left-[2px]",
                ])}
              />
            </Switch.Control>
          </Switch.Root>

          <Switch.Root
            class="flex items-center gap-2 cursor-pointer"
            checked={showRuby()}
            onChange={setShowRuby}
          >
            <Switch.Label class="font-mono text-[10.5px] font-medium text-ink">
              Ruby
            </Switch.Label>
            <Switch.Control
              class={cn([
                "w-[30px] h-[17px]", // Sizing
                "rounded-full", // Borders
                "relative", // Layout
                "transition-colors", // Transitions
                showRuby() ? "bg-caret" : "bg-sub-alt",
              ])}
            >
              <Switch.Thumb
                class={cn([
                  "absolute top-[2px] w-[13px] h-[13px]", // Positioning + Sizing
                  "rounded-full", // Borders
                  "bg-white", // Backgrounds
                  "shadow-[0_1px_2px_rgba(0,0,0,.2)]", // Effects
                  "transition-[left]", // Transitions
                  showRuby() ? "left-[15px]" : "left-[2px]",
                ])}
              />
            </Switch.Control>
          </Switch.Root>
        </div>
      </div>*/}

      {/* Action Footer */}
      <Show when={state.error}>
        <div
          class={cn([
            "mt-3",
            "px-3 py-2",
            "text-[10px] leading-[1.5]",
            "text-error bg-error/10",
            "rounded-[8px]",
          ])}
        >
          {state.error}
        </div>
      </Show>
      <div
        class={cn([
          "flex items-center justify-between", // Flexbox
          "mt-[14px]", // Spacing
        ])}
      >
        <div
          class={cn([
            "flex items-center gap-[5px]", // Flexbox + Spacing
            "font-mono text-[10px] text-ink", // Typography
          ])}
        >
          {/*<span
            class={cn([
              "bg-sub-alt rounded-[4px]", // Backgrounds + Borders
              "px-[6px] py-[2px]", // Spacing
              "text-[9px] font-semibold text-chip", // Typography
            ])}
          >
            Esc
          </span>
          <span>đóng</span>
          <span class="opacity-40 mx-1">·</span>*/}
          <span
            class={cn([
              "bg-sub-alt rounded-[4px]", // Backgrounds + Borders
              "px-[6px] py-[2px]", // Spacing
              "text-[9px] font-semibold text-chip", // Typography
            ])}
          >
            ⌘
          </span>
          <span>+</span>
          <span
            class={cn([
              "bg-sub-alt rounded-[4px]", // Backgrounds + Borders
              "px-[6px] py-[2px]", // Spacing
              "text-[9px] font-semibold text-chip", // Typography
            ])}
          >
            ↵
          </span>
          <span>dịch</span>
        </div>

        <div
          class={cn([
            "flex items-center gap-2", // Flexbox + Spacing
          ])}
        >
          <button
            onClick={submit}
            disabled={state.busy}
            class={cn([
              "h-[33px] px-[14px]", // Sizing + Spacing
              "rounded-[9px]", // Borders
              "font-mono text-[10.5px] font-bold tracking-[.08em] uppercase", // Typography
              "inline-flex items-center gap-[7px]", // Layout + Flexbox + Spacing
              "cursor-pointer", // Interactivity
              "transition-all", // Transitions
              "bg-caret text-main border border-transparent", // Backgrounds + Borders + Typography
              "shadow-sm shadow-main/20", // Effects
              "hover:brightness-105", // Interactivity
              "disabled:opacity-50 disabled:cursor-wait", // Disabled
            ])}
          >
            <RotateCcw class="w-[13px] h-[13px]" />
            {state.busy ? "Đang dịch…" : "Dịch ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}
