/**
 * On-device OCR via `@paddleocr/paddleocr-js` (PP-OCRv5, lang "ch").
 *
 * Lazy singleton: the SDK (onnxruntime + opencv) is dynamically imported
 * so `pnpm build` / vitest never pay the cost until first use.
 * `readyOcr()` queues concurrent callers on one shared promise — rapid
 * clicks before init are safe.
 */

export type LocalOcrStatus = "idle" | "loading" | "ready" | "error";

export interface LocalOcrProgress {
  /** 0..1 stage estimate (SDK exposes no byte progress). */
  fraction: number;
  stage: string;
}

export interface LocalOcrBox {
  poly: Array<{ x: number; y: number }>;
  text: string;
  score: number;
}

export interface LocalOcrResult {
  text: string;
  avgScore: number;
  minScore: number;
  lineCount: number;
  boxes: LocalOcrBox[];
}

type OcrInstance = {
  predict: (
    input: unknown,
    params?: {
      textDetThresh: number;
      textDetBoxThresh: number;
      textDetUnclipRatio: number;
      textRecScoreThresh: number;
    },
  ) => Promise<Array<{ items: LocalOcrBox[] }>>;
  dispose: () => Promise<void>;
};

/** Detection/recognition thresholds, copied from the official Vite demo. */
const RUNTIME_PARAMS = {
  textDetThresh: 0.3,
  textDetBoxThresh: 0.6,
  textDetUnclipRatio: 1.5,
  textRecScoreThresh: 0.1,
};

let instance: OcrInstance | null = null;
let status: LocalOcrStatus = "idle";
let lastError = "";
let readyPromise: Promise<OcrInstance | null> | null = null;
const listeners = new Set<(p: LocalOcrProgress) => void>();

function emit(p: LocalOcrProgress) {
  for (const cb of listeners) {
    try {
      cb(p);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function onOcrProgress(cb: (p: LocalOcrProgress) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function ocrStatus(): LocalOcrStatus {
  return status;
}

export function ocrLastError(): string {
  return lastError;
}

async function createInstance(): Promise<OcrInstance> {
  const { PaddleOCR } = await import("@paddleocr/paddleocr-js");
  emit({ fraction: 0.1, stage: "Loading OCR runtime…" });
  // Match the official Vite demo (paddleocr-js/apps/demo/src/main.ts):
  // main-thread pipeline (`worker: false`), CDN wasmPaths, 1 thread unless
  // the page is cross-origin isolated. `worker: true` breaks under Vite dev
  // (worker-entry import.meta.url isn't copied to .vite/deps) and Tauri's
  // WebView has no COOP/COEP headers, so threaded WASM would fail anyway.
  // 1 thread unless the page is cross-origin isolated (COOP/COEP headers
  // in vite.config.ts enable it in dev; Tauri's WebView has none).
  const numThreads =
    typeof self !== "undefined" && (self as { crossOriginIsolated?: boolean }).crossOriginIsolated
      ? Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 2) - 1))
      : 1;
  const ocr = (await PaddleOCR.create({
    lang: "ch",
    ocrVersion: "PP-OCRv5",
    worker: false,
    ortOptions: {
      backend: "wasm",
      wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/",
      numThreads,
      simd: true,
    },
  })) as unknown as OcrInstance;
  emit({ fraction: 0.9, stage: "Warming up models…" });
  return ocr;
}

/**
 * Resolve the shared OCR instance. Returns null (never throws) when
 * local OCR is unavailable — callers fall back to cloud vision.
 * Concurrent callers share one init.
 */
export function readyOcr(): Promise<OcrInstance | null> {
  if (instance) return Promise.resolve(instance);
  if (readyPromise) return readyPromise;
  status = "loading";
  lastError = "";
  readyPromise = (async () => {
    try {
      const ocr = await createInstance();
      instance = ocr;
      status = "ready";
      emit({ fraction: 1, stage: "Ready" });
      return ocr;
    } catch (e) {
      status = "error";
      lastError = e instanceof Error ? e.message : "Failed to load local OCR";
      emit({ fraction: 0, stage: lastError });
      return null;
    }
  })();
  return readyPromise;
}

/** Retry after a failure (clears the cached error state). */
export function retryOcr(): Promise<OcrInstance | null> {
  readyPromise = null;
  if (status === "error") status = "idle";
  return readyOcr();
}

function summarize(items: LocalOcrBox[]): LocalOcrResult {
  const lines = items
    .map((it) => ({ text: (it.text ?? "").trim(), score: it.score ?? 0, poly: it.poly ?? [] }))
    .filter((it) => it.text.length > 0);
  const scores = lines.map((l) => l.score);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  return {
    text: lines.map((l) => l.text).join("\n"),
    avgScore,
    minScore: scores.length ? Math.min(...scores) : 0,
    lineCount: lines.length,
    boxes: lines,
  };
}

/**
 * Run local OCR on already-prepared image bytes (PNG/JPEG from
 * `prepareImageForOcr`). Throws when local OCR is unavailable.
 */
export async function recognizeLocal(
  bytes: Uint8Array,
  mediaType: string,
): Promise<LocalOcrResult> {
  const ocr = await readyOcr();
  if (!ocr) throw new Error(lastError || "Local OCR unavailable");
  const blob = new Blob([bytes as unknown as BlobPart], { type: mediaType });
  const [result] = await ocr.predict(blob, RUNTIME_PARAMS);
  return summarize(result?.items ?? []);
}
