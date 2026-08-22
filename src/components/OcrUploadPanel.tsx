import { FileField } from "@kobalte/core/file-field";
import { Button } from "@kobalte/core/button";
import { Upload, ClipboardPaste, ChevronRight, FileText } from "lucide-solid";
import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import { Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import { fmtShortcut, MOD_KEY } from "@/lib/platform";
import { rgbaToPng } from "@/lib/image";
import { resolveCredentials, translate, TranslateError } from "@/lib/translate";
import { usePreferences } from "@/stores/preferences";
import { useTranslation } from "@/stores/translation";
import { cn } from "@/lib/utils";
import Badge from "./Badge";
import {
  FALLBACK_CLIPBOARD_IMAGE_ERROR,
  MAX_UPLOAD_FILES,
  ROUTES,
} from "@/constants";

interface OcrUploadState {
  busy: boolean;
  error: string;
}

export default function OcrUploadPanel() {
  const prefs = usePreferences();
  const t = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = createStore<OcrUploadState>({
    busy: false,
    error: "",
  });

  async function handleClipboardOcr() {
    if (state.busy) return;
    setState({ busy: true, error: "" });
    try {
      const provider = prefs.preferences().byokProvider;
      const { apiKey } = resolveCredentials(prefs.apiKeys(), provider);
      const image = await readImage();
      const [rgba, size] = await Promise.all([image.rgba(), image.size()]);
      const pngData = await rgbaToPng(rgba, size.width, size.height);
      const result = await translate({
        imageData: pngData,
        targetLanguage: prefs.preferences().targetLanguage,
        provider,
        apiKey,
      });
      t.setTranslationResult(result, "upload");
      navigate(ROUTES.result);
    } catch (e) {
      setState({
        error:
          e instanceof TranslateError ? e.message : FALLBACK_CLIPBOARD_IMAGE_ERROR,
      });
    } finally {
      setState({ busy: false });
    }
  }

  return (
    <div class={cn(["flex flex-col gap-0", "font-mono"])}>
      {/* Status Row */}
      <div class={cn(["flex items-center justify-between", "mb-[14px]"])}>
        <div class={cn(["flex items-center gap-[6px]"])}>
          <Badge variant="success" dot>
            OCR Engine Ready
          </Badge>
          <Badge>Image Mode</Badge>
          <Badge>
            ZH
            <ChevronRight class="w-2 h-2" />
            VI
          </Badge>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <FileField
        class={cn([
          "flex flex-col items-center gap-3",
          "bg-paper",
          "border-[1.5px] border-dashed border-sub",
          "rounded-xl",
          "p-4",
          "text-center",
          "cursor-pointer",
          "transition-all duration-200",
          "hover:border-caret hover:bg-caret/15",
        ])}
        multiple
        maxFiles={MAX_UPLOAD_FILES}
        allowDragAndDrop
        onFileAccept={(data) => console.log("accepted", data)}
        onFileReject={(data) => console.log("rejected", data)}
      >
        <FileField.Dropzone
          class={cn(["flex flex-col items-center gap-3", "w-full"])}
        >
          <div
            class={cn([
              "w-[50px] h-[50px]",
              "rounded-[14px]",
              "bg-caret/16",
              "border border-caret/35",
              "grid place-items-center",
              "text-caret-deep",
            ])}
          >
            <Upload class="w-6 h-6" />
          </div>

          <div>
            <p
              class={cn([
                "font-semibold text-[12.5px] leading-[1.3]",
                "text-main",
                "m-0",
              ])}
            >
              Kéo thả ảnh vào đây hoặc bấm để chọn tệp
            </p>
            <p
              class={cn([
                "text-[10px] leading-[1.5]",
                "text-ink",
                "m-0 mt-1",
              ])}
            >
              Hỗ trợ PNG, JPG, WEBP, BMP · Tự động nhận diện chữ Hán
            </p>
          </div>

          <div class="mt-[2px]">
            <FileField.Trigger
              class={cn([
                "inline-flex items-center gap-1",
                "text-[9.5px] font-bold",
                "text-chip",
                "bg-sub-alt",
                "border border-main/12",
                "rounded-[5px]",
                "px-[6px] py-[2px]",
                "shadow-sm shadow-main/20",
                "cursor-pointer",
              ])}
            >
              {fmtShortcut(MOD_KEY, "V")}
            </FileField.Trigger>
            <span class={cn(["text-[10px] ml-1", "text-ink"])}>
              để dán ảnh ngay từ Clipboard
            </span>
          </div>
        </FileField.Dropzone>

        <FileField.HiddenInput />
      </FileField>

      {/* Or Divider */}
      <div class={cn(["flex items-center gap-[10px]", "my-[14px]"])}>
        <div class="flex-1 h-px bg-main/9" />
        <span
          class={cn([
            "text-[9px] font-semibold tracking-[.16em] uppercase",
            "text-sub",
          ])}
        >
          Hoặc phát hiện từ bộ nhớ tạm
        </span>
        <div class="flex-1 h-px bg-main/9" />
      </div>

      {/* Clipboard Quick Action Banner */}
      <div
        class={cn([
          "bg-paper",
          "border border-caret/35",
          "rounded-[10px]",
          "p-[10px] px-[14px]",
          "flex items-center justify-between gap-3",
        ])}
      >
        <div class={cn(["flex items-center gap-[10px]"])}>
          <div
            class={cn([
              "w-[36px] h-[36px]",
              "rounded-[6px]",
              "bg-panel",
              "border border-main/12",
              "grid place-items-center",
              "overflow-hidden",
              "text-ink",
            ])}
          >
            <FileText class="w-4 h-4" />
          </div>
          <div class={cn(["flex flex-col gap-[2px]"])}>
            <div
              class={cn([
                "flex items-center gap-[6px]",
                "font-semibold text-[11px]",
                "text-main",
              ])}
            >
              <span class="w-[6px] h-[6px] rounded-full bg-caret" />
              Ảnh vừa chụp từ màn hình
            </div>
            <div class={cn(["text-[9.5px]", "text-ink"])}>
              Clipboard (1240 × 380px)
            </div>
          </div>
        </div>

        <Button
          onClick={handleClipboardOcr}
          disabled={state.busy}
          class={cn([
            "h-[28px] px-[10px]",
            "bg-caret/20",
            "border border-caret/40",
            "rounded-[6px]",
            "font-bold text-[9.5px] tracking-[.04em]",
            "text-caret-deep",
            "inline-flex items-center gap-[5px]",
            "cursor-pointer",
            "whitespace-nowrap",
            "transition-all duration-150",
            "hover:bg-caret hover:text-main",
          ])}
        >
          <ClipboardPaste class="w-3 h-3" />
          {state.busy ? "Đang đọc…" : "Đọc & OCR"}
        </Button>
      </div>
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
    </div>
  );
}
