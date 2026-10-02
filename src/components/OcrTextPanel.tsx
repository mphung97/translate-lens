import { useEffect, useRef } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from "react-zoom-pan-pinch";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocalOcrBox } from "@/lib/localOcr";
import { drawTextPanel, measureTextPanel } from "@/lib/ocrTextPanel";

/** Zoom buttons — must render inside TransformWrapper for context. */
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className={cn(["flex items-center gap-1"])}>
      <button
        type="button"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() => zoomIn()}
        className={cn([
          "flex items-center justify-center",
          "size-6",
          "bg-transparent border border-main/8",
          "rounded-[6px]",
          "text-sub",
          "cursor-pointer",
          "transition-colors duration-150",
          "hover:text-main hover:border-main/16",
        ])}
      >
        <ZoomIn className="size-3" />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() => zoomOut()}
        className={cn([
          "flex items-center justify-center",
          "size-6",
          "bg-transparent border border-main/8",
          "rounded-[6px]",
          "text-sub",
          "cursor-pointer",
          "transition-colors duration-150",
          "hover:text-main hover:border-main/16",
        ])}
      >
        <ZoomOut className="size-3" />
      </button>
      <button
        type="button"
        aria-label="Reset zoom"
        title="Reset zoom"
        onClick={() => resetTransform()}
        className={cn([
          "flex items-center justify-center",
          "size-6",
          "bg-transparent border border-main/8",
          "rounded-[6px]",
          "text-sub",
          "cursor-pointer",
          "transition-colors duration-150",
          "hover:text-main hover:border-main/16",
        ])}
      >
        <RotateCcw className="size-3" />
      </button>
    </div>
  );
}

/**
 * Right-side OCR text panel: white canvas with a stroked outline per box
 * and the recognized text fitted inside (rotated / vertical-aware).
 * Renders nothing when there are no boxes.
 */
export default function OcrTextPanel(props: { boxes: LocalOcrBox[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measured = measureTextPanel(props.boxes);
  // Remount the wrapper per OCR result so stale zoom never carries over.
  const boxesKey = `${props.boxes.length}:${props.boxes.reduce((n, b) => n + b.text.length, 0)}:${props.boxes[0]?.text.slice(0, 16) ?? ""}`;

  useEffect(() => {
    // Canvas 2D painting is external-system sync — the one legitimate
    // useEffect case. Size attrs come from render; this only paints.
    const canvas = canvasRef.current;
    if (!canvas) return;
    const m = measureTextPanel(props.boxes);
    if (!m) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, m.width, m.height);
    drawTextPanel(ctx, props.boxes, m);
  }, [props.boxes]);

  if (!measured) return null;

  return (
    <div
      className={cn([
        "relative",
        "px-3 py-2.5",
        "bg-panel border border-main/8",
        "rounded-[10px]",
        "transition-colors duration-150",
        "hover:border-main/16",
        "overflow-hidden",
      ])}
    >
      <TransformWrapper
        key={boxesKey}
        initialScale={1}
        minScale={0.3}
        maxScale={4}
        limitToBounds={false}
        wheel={{ step: 0.15 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "toggle" }}
      >
        <div className={cn(["flex items-center justify-between", "mb-[5px]"])}>
          <span
            className={cn([
              "flex items-center gap-1.5",
              "text-[8.5px] font-bold tracking-[.16em] uppercase",
              "text-ink",
            ])}
          >
            OCR Layout
            <span className={cn(["font-medium tracking-normal", "text-sub"])}>
              · proof
            </span>
          </span>
          <ZoomControls />
        </div>
        <TransformComponent
          wrapperStyle={{
            maxHeight: 320,
            cursor: "grab",
            overflow: "hidden",
            maxWidth: "100%",
          }}
          contentStyle={{ cursor: "grab" }}
        >
          <canvas
            ref={canvasRef}
            width={measured.width}
            height={measured.height}
            className={cn([
              "block",
              "max-w-none h-auto",
              "bg-white",
              "rounded-[6px]",
              "border border-main/8",
            ])}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
