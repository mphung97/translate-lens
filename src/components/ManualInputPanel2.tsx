import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ClipboardPaste,
  X,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
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
  const [state, setState] = useState<ManualInputState>({
    input: "",
    showPinyin: true,
    showRuby: false,
    busy: false,
    error: "",
  });

  const charCount = state.input.length;
  const maxChars = MAX_INPUT_CHARS;

  function editInput(v: string) {
    setState((s) => ({ ...s, input: v, error: "" }));
  }

  function clearInput() {
    setState((s) => ({ ...s, input: "", error: "" }));
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
      setState((s) => ({ ...s, error: "Không đọc được nội dung clipboard" }));
    }
  }

  async function submit() {
    const text = state.input.trim();
    if (!text || state.busy) return;
    setState((s) => ({ ...s, busy: true, error: "" }));
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
      navigate({ to: ROUTES.result });
    } catch (e) {
      setState((s) => ({
        ...s,
        error:
          e instanceof TranslateError ? e.message : FALLBACK_TRANSLATE_ERROR,
      }));
    } finally {
      setState((s) => ({ ...s, busy: false }));
    }
  }

  return (
    <div
      className={cn([
        "relative", // Layout
        "flex flex-col", // Flexbox
        "bg-bg", // Backgrounds
      ])}
    >
      {/* Status Row */}
      <div
        className={cn([
          "flex items-center justify-between", // Flexbox
          "mb-3", // Spacing
        ])}
      >
        <div
          className={cn([
            "flex items-center gap-[6px]", // Flexbox + Spacing
          ])}
        >
          <Badge variant="success" dot>
            Manual Mode
          </Badge>
          <Badge>Auto Detect ZH</Badge>
          <Badge>
            ZH
            <ChevronRight className="w-2 h-2" />
            VI
          </Badge>
        </div>
      </div>

      {/* Input Panel */}
      <div
        className={cn([
          "relative", // Layout
          "bg-panel border border-main/10", // Backgrounds + Borders
          "rounded-[12px]", // Borders
          "p-[14px] pb-[12px]", // Spacing
          "shadow-inner shadow-main/5", // Effects
        ])}
      >
        <div
          className={cn([
            "min-h-[126px]", // Sizing
          ])}
        >
          <textarea
            className={cn([
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
            onChange={(e) => editInput(e.target.value)}
            rows={TEXTAREA_ROWS}
          />
        </div>

        {/* Input Tools */}
        <div
          className={cn([
            "flex items-center justify-between", // Flexbox
            "pt-[10px] mt-[6px]", // Spacing
            "border-t border-dashed border-main/10", // Borders
          ])}
        >
          <span
            className={cn([
              "text-[10px] font-medium", // Typography
              "text-ink tracking-[.02em]", // Typography (color)
            ])}
          >
            {charCount.toLocaleString()} / {maxChars.toLocaleString()} ký tự
          </span>

          <div
            className={cn([
              "flex items-center gap-[6px]", // Flexbox + Spacing
            ])}
          >
            <button
              type="button"
              onClick={pasteFromClipboard}
              className={cn([
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
              <ClipboardPaste className="w-[11px] h-[11px]" />
              Dán nhanh
            </button>
            <button
              type="button"
              onClick={clearInput}
              className={cn([
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
              <X className="w-[11px] h-[11px]" />
              Xóa
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {state.error && (
        <div
          className={cn([
            "mt-3",
            "px-3 py-2",
            "text-[10px] leading-[1.5]",
            "text-error bg-error/10",
            "rounded-[8px]",
          ])}
        >
          {state.error}
        </div>
      )}
      <div
        className={cn([
          "flex items-center justify-between", // Flexbox
          "mt-[14px]", // Spacing
        ])}
      >
        <div
          className={cn([
            "flex items-center gap-[5px]", // Flexbox + Spacing
            "font-mono text-[10px] text-ink", // Typography
          ])}
        >
          <span
            className={cn([
              "bg-sub-alt rounded-[4px]", // Backgrounds + Borders
              "px-[6px] py-[2px]", // Spacing
              "text-[9px] font-semibold text-chip", // Typography
            ])}
          >
            ⌘
          </span>
          <span>+</span>
          <span
            className={cn([
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
          className={cn([
            "flex items-center gap-2", // Flexbox + Spacing
          ])}
        >
          <button
            type="button"
            onClick={submit}
            disabled={state.busy}
            className={cn([
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
            <RotateCcw className="w-[13px] h-[13px]" />
            {state.busy ? "Đang dịch…" : "Dịch ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}
