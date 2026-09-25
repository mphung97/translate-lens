import { useRef, useState } from "react";
import { Upload, ClipboardPaste, ChevronRight, FileText } from "lucide-react";
import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import { useNavigate } from "@tanstack/react-router";
import { prepareFileForOcr, prepareImageForOcr } from "@/lib/image";
import type { PreparedImage } from "@/lib/image";
import { resolveCredentials, translate, TranslateError } from "@/lib/translate";
import type { TranslateResult } from "@/lib/translate";
import { recognizeLocal } from "@/lib/localOcr";
import { usePreferences } from "@/stores/preferences";
import { useTranslation } from "@/stores/translation";
import { cn } from "@/lib/utils";
import Badge from "./Badge";
import {
  FALLBACK_CLIPBOARD_IMAGE_ERROR,
  FALLBACK_UPLOAD_ERROR,
  OCR_MIN_SCORE,
  OCR_UNREADABLE_ERROR,
  ROUTES,
} from "@/constants";

const ACCEPT = "image/png,image/jpeg,image/webp,image/bmp";

export default function OcrUploadPanel() {
  const prefs = usePreferences();
  const t = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function runOcrTranslate(prepared: PreparedImage): Promise<{
    result: TranslateResult;
    ocrScore: number;
  }> {
    const provider = prefs.preferences().byokProvider;
    const { apiKey } = resolveCredentials(prefs.apiKeys(), provider);
    const targetLanguage = prefs.preferences().targetLanguage;

    // Local-only OCR (awaits init when the user clicks before ready).
    // Weak or empty recognition blocks with an error.
    const local = await recognizeLocal(prepared.bytes, prepared.mediaType);
    console.info("[ocr]", {
      avgScore: local.avgScore,
      minScore: local.minScore,
      lineCount: local.lineCount,
    });
    if (!local.text.trim() || local.avgScore < OCR_MIN_SCORE) {
      throw new TranslateError(OCR_UNREADABLE_ERROR, "INVALID_RESPONSE");
    }
    const result = await translate({
      text: local.text,
      targetLanguage,
      provider,
      apiKey,
    });
    return { result, ocrScore: local.avgScore };
  }

  async function runAndNavigate(
    getPrepared: () => Promise<PreparedImage>,
    fallbackMsg: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const prepared = await getPrepared();
      const { result, ocrScore } = await runOcrTranslate(prepared);
      t.setTranslationResult(result, "upload", ocrScore);
      navigate({ to: ROUTES.result });
    } catch (e) {
      setError(e instanceof TranslateError ? e.message : fallbackMsg);
    } finally {
      setBusy(false);
    }
  }

  function handleClipboardOcr() {
    return runAndNavigate(async () => {
      const image = await readImage();
      const [rgba, size] = await Promise.all([image.rgba(), image.size()]);
      return prepareImageForOcr(rgba, size.width, size.height);
    }, FALLBACK_CLIPBOARD_IMAGE_ERROR);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Chỉ hỗ trợ ảnh PNG, JPG, WEBP, BMP");
      return;
    }
    return runAndNavigate(
      () => prepareFileForOcr(file),
      FALLBACK_UPLOAD_ERROR,
    );
  }

  return (
    <div className={cn(["flex flex-col gap-0", "font-mono"])}>
      {/* Status Row */}
      <div className={cn(["flex items-center justify-between", "mb-[14px]"])}>
        <div className={cn(["flex items-center gap-[6px]"])}>
          <Badge variant="success" dot>
            OCR Engine Ready
          </Badge>
          <Badge>Image Mode</Badge>
          <Badge>
            ZH
            <ChevronRight className="w-2 h-2" />
            VI
          </Badge>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && fileInput.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) {
            e.preventDefault();
            fileInput.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (busy) return;
          handleFile(e.dataTransfer.files[0]);
        }}
        className={cn([
          "flex flex-col items-center gap-3",
          "bg-paper",
          "border-[1.5px] border-dashed border-sub",
          "rounded-xl",
          "p-4",
          "text-center",
          "cursor-pointer",
          "transition-all duration-200",
          "hover:border-caret hover:bg-caret/15",
          dragging && "border-caret bg-caret/15",
        ])}
      >
        <div className={cn(["flex flex-col items-center gap-3", "w-full"])}>
          <div
            className={cn([
              "w-[50px] h-[50px]",
              "rounded-[14px]",
              "bg-caret/16",
              "border border-caret/35",
              "grid place-items-center",
              "text-caret-deep",
            ])}
          >
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p
              className={cn([
                "font-semibold text-[12.5px] leading-[1.3]",
                "text-main",
                "m-0",
              ])}
            >
              {busy ? "Đang đọc ảnh…" : "Kéo thả ảnh vào đây hoặc bấm để chọn tệp"}
            </p>
            <p className={cn(["text-[10px] leading-[1.5]", "text-ink", "m-0 mt-1"])}>
              Hỗ trợ PNG, JPG, WEBP, BMP · Tự động nhận diện chữ Hán
            </p>
          </div>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {/* Or Divider */}
      <div className={cn(["flex items-center gap-[10px]", "my-[14px]"])}>
        <div className="flex-1 h-px bg-main/9" />
        <span
          className={cn([
            "text-[9px] font-semibold tracking-[.16em] uppercase",
            "text-sub",
          ])}
        >
          Hoặc phát hiện từ bộ nhớ tạm
        </span>
        <div className="flex-1 h-px bg-main/9" />
      </div>

      {/* Clipboard Quick Action Banner */}
      <div
        className={cn([
          "bg-paper",
          "border border-caret/35",
          "rounded-[10px]",
          "p-[10px] px-[14px]",
          "flex items-center justify-between gap-3",
        ])}
      >
        <div className={cn(["flex items-center gap-[10px]"])}>
          <div
            className={cn([
              "w-[36px] h-[36px]",
              "rounded-[6px]",
              "bg-panel",
              "border border-main/12",
              "grid place-items-center",
              "overflow-hidden",
              "text-ink",
            ])}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div className={cn(["flex flex-col gap-[2px]"])}>
            <div
              className={cn([
                "flex items-center gap-[6px]",
                "font-semibold text-[11px]",
                "text-main",
              ])}
            >
              <span className="w-[6px] h-[6px] rounded-full bg-caret" />
              Ảnh vừa chụp từ màn hình
            </div>
            <div className={cn(["text-[9.5px]", "text-ink"])}>
              Clipboard (1240 × 380px)
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClipboardOcr}
          disabled={busy}
          className={cn([
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
          <ClipboardPaste className="w-3 h-3" />
          {busy ? "Đang đọc…" : "Đọc & OCR"}
        </button>
      </div>
      {error && (
        <div
          className={cn([
            "mt-3",
            "px-3 py-2",
            "text-[10px] leading-[1.5]",
            "text-error bg-error/10",
            "rounded-[8px]",
          ])}
        >
          {error}
        </div>
      )}
    </div>
  );
}
