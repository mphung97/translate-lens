import { createSignal, onCleanup, onMount, Show, type ParentProps } from "solid-js";
import { cn } from "@/lib/utils";
import { ocrLastError, ocrStatus, onOcrProgress, readyOcr, retryOcr } from "@/lib/localOcr";

const GATE_DELAY_MS = 300;

export default function Splash(props: ParentProps) {
  const [visible, setVisible] = createSignal(false);
  const [fraction, setFraction] = createSignal(0);
  const [stage, setStage] = createSignal("Loading local OCR…");
  const [failed, setFailed] = createSignal("");
  const [skipped, setSkipped] = createSignal(false);
  const [retrying, setRetrying] = createSignal(false);

  let timer: number | undefined;

  function dismiss() {
    window.clearTimeout(timer);
    setVisible(false);
  }

  /** Fresh init, or retry that clears the cached error first. */
  function loadOcr() {
    return ocrStatus() === "error" ? retryOcr().catch(() => null) : readyOcr().catch(() => null);
  }

  async function init() {
    const unsub = onOcrProgress((p) => {
      setFraction(p.fraction);
      setStage(p.stage);
    });
    onCleanup(unsub);
    // Show the gate only when init is slow (first run / model download).
    // Cached launches resolve fast and skip the gate.
    timer = window.setTimeout(() => {
      if (ocrStatus() === "loading") setVisible(true);
    }, GATE_DELAY_MS);
    const ocr = await loadOcr();
    if (ocr) {
      dismiss();
    } else {
      setFailed(ocrLastError() || "Failed to load local OCR");
      setVisible(true);
    }
  }

  onMount(() => {
    void init();
  });
  onCleanup(() => window.clearTimeout(timer));

  async function handleRetry() {
    setRetrying(true);
    setFailed("");
    const ocr = await loadOcr();
    setRetrying(false);
    if (ocr) {
      dismiss();
    } else {
      setFailed(ocrLastError() || "Failed to load local OCR");
    }
  }

  const pct = () => Math.round(fraction() * 100);

  return (
    <>
      {props.children}
      <Show when={visible() && !skipped()}>
        <div
          class={cn([
            "absolute inset-0 z-50",
            "flex flex-col items-center justify-center gap-3",
            "p-6",
            "bg-bg",
            "font-mono",
          ])}
        >
          <Show
            when={!failed()}
            fallback={
              <>
                <p class={cn(["m-0", "text-[12px] font-semibold", "text-main"])}>
                  Local OCR failed to load
                </p>
                <p class={cn(["m-0", "text-[10px] leading-[1.5]", "text-ink"])}>
                  {failed()}
                </p>
                <div class={cn(["flex items-center gap-2", "mt-1"])}>
                  <button
                    onClick={handleRetry}
                    disabled={retrying()}
                    class={cn([
                      "h-[30px] px-[13px]",
                      "rounded-[8px]",
                      "border-0",
                      "bg-caret text-main",
                      "text-[10px] font-bold",
                      "cursor-pointer",
                    ])}
                  >
                    {retrying() ? "Retrying…" : "Retry"}
                  </button>
                  <button
                    onClick={() => setSkipped(true)}
                    class={cn([
                      "h-[30px] px-[13px]",
                      "rounded-[8px]",
                      "bg-sub-alt",
                      "border border-main/12",
                      "text-[10px] font-bold",
                      "text-chip",
                      "cursor-pointer",
                    ])}
                  >
                    Continue with cloud vision
                  </button>
                </div>
              </>
            }
          >
            <p class={cn(["m-0", "text-[12px] font-semibold", "text-main"])}>
              Preparing local OCR…
            </p>
            <div
              class={cn([
                "w-full max-w-[260px] h-[6px]",
                "rounded-full",
                "bg-sub-alt",
                "overflow-hidden",
              ])}
            >
              <div
                class={cn(["h-full", "rounded-full", "bg-caret", "transition-all duration-300"])}
                style={{ width: `${Math.max(pct(), 4)}%` }}
              />
            </div>
            <p class={cn(["m-0", "text-[10px]", "text-ink"])}>
              {stage()} {pct()}%
            </p>
            <button
              onClick={() => setSkipped(true)}
              class={cn([
                "mt-1",
                "bg-transparent border-0",
                "text-[10px]",
                "text-sub",
                "underline",
                "cursor-pointer",
              ])}
            >
              Skip — use cloud vision
            </button>
          </Show>
        </div>
      </Show>
    </>
  );
}
