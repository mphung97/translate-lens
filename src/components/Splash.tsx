import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import * as Progress from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import {
  getOcrProgress,
  ocrLastError,
  ocrStatus,
  onOcrProgress,
  readyOcr,
  retryOcr,
} from "@/lib/localOcr";

const GATE_DELAY_MS = 300;

export default function Splash(props: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState("");
  const [retrying, setRetrying] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  // External-store subscription (no useEffect + setState): progress pushes
  // from the OCR singleton; bar width glides via CSS transition below.
  const progress = useSyncExternalStore(onOcrProgress, getOcrProgress);

  useEffect(() => {
    async function loadOcr() {
      return ocrStatus() === "error"
        ? retryOcr().catch(() => null)
        : readyOcr().catch(() => null);
    }

    async function init() {
      // Show the gate only when init is slow (first run / model download).
      // Cached launches resolve fast and skip the gate.
      timer.current = window.setTimeout(() => {
        if (ocrStatus() === "loading") setVisible(true);
      }, GATE_DELAY_MS);
      const ocr = await loadOcr();
      if (ocr) {
        window.clearTimeout(timer.current);
        setVisible(false);
      } else {
        setFailed(ocrLastError() || "Failed to load local OCR");
        setVisible(true);
      }
    }

    void init();
    return () => window.clearTimeout(timer.current);
  }, []);

  async function handleRetry() {
    setRetrying(true);
    setFailed("");
    const ocr = await (ocrStatus() === "error"
      ? retryOcr().catch(() => null)
      : readyOcr().catch(() => null));
    setRetrying(false);
    if (ocr) {
      window.clearTimeout(timer.current);
      setVisible(false);
    } else {
      setFailed(ocrLastError() || "Failed to load local OCR");
    }
  }

  const pct = Math.round(progress.fraction * 100);

  return (
    <>
      {props.children}
      {visible && (
        <div
          className={cn([
            "absolute inset-0 z-50",
            "flex flex-col items-center justify-center gap-3",
            "p-6",
            "bg-bg",
            "font-mono",
          ])}
        >
          {failed ? (
            <>
              <p className={cn(["m-0", "text-[12px] font-semibold", "text-main"])}>
                Local OCR failed to load
              </p>
              <p className={cn(["m-0", "text-[10px] leading-[1.5]", "text-ink"])}>
                {failed}
              </p>
              <div className={cn(["flex items-center gap-2", "mt-1"])}>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className={cn([
                    "h-[30px] px-[13px]",
                    "rounded-[8px]",
                    "border-0",
                    "bg-caret text-main",
                    "text-[10px] font-bold",
                    "cursor-pointer",
                  ])}
                >
                  {retrying ? "Retrying…" : "Retry"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={cn(["m-0", "text-[12px] font-semibold", "text-main"])}>
                Preparing local OCR…
              </p>
              <Progress.Root
                value={pct}
                getValueLabel={(value) => `${value}%`}
                className={cn(["flex flex-col gap-3", "w-full max-w-[260px]"])}
              >
                <div
                  className={cn([
                    "h-[6px]",
                    "rounded-full",
                    "bg-sub-alt",
                    "overflow-hidden",
                  ])}
                >
                  <Progress.Indicator
                    className={cn([
                      "block h-full",
                      "rounded-full",
                      "bg-caret",
                      "transition-[width] duration-300 ease-out",
                    ])}
                    style={{ width: `max(${pct}%, 4%)` }}
                  />
                </div>
                <div
                  className={cn([
                    "flex items-center justify-between",
                    "text-[10px]",
                    "text-ink",
                  ])}
                >
                  <span>{progress.stage}</span>
                  <span>{pct}%</span>
                </div>
              </Progress.Root>
            </>
          )}
        </div>
      )}
    </>
  );
}
