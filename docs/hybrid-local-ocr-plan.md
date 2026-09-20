# Hybrid Local OCR Plan (Option A Locked)

## Goal

Run OCR on-device with `@paddleocr/paddleocr-js` (PP-OCRv5, `lang: "ch"`)
as the primary path. Fall back to cloud vision only when local
recognition is weak or empty. Translation always reuses the existing
text `translate()` path when local OCR succeeds.

## Decisions locked

1. Routing: option A hybrid — local first, cloud vision fallback.
2. `OCR_MIN_SCORE = 0.7` (average line confidence). Calibrate after ~20
   real pastes; candidate follow-up rule: `avg >= 0.7 AND min >= 0.4`.
3. Splash: option A — full progress gate on first run (model download),
   silent background warm-up on later launches.
4. Sizing reuse: `prepareImageForOcr` thresholds 400 / 800 / 1536,
   JPEG 0.82 (see `docs/focus-clipboard-probe-plan.md` for dims).
5. Base64 rejected: SDK accepts `Uint8Array`; manual Base64 adds 33%.

## Routing rule

```ts
const { text, avgScore } = await recognize(prepared.bytes);
if (text.trim() && avgScore >= OCR_MIN_SCORE) {
  // cheap path, zero image tokens
  await translate({ text, targetLanguage, provider, apiKey, model: models.text });
} else {
  // fallback, OCR + translate in one vision call
  await translate({ imageData: prepared.bytes, imageMediaType: prepared.mediaType, ... });
}
```

- Empty text always falls back, regardless of score.
- Badge shows "Local OCR" vs "Cloud vision" per path taken.
- Log `{ avgScore, minScore, lineCount }` per call for calibration.

## New files

- `src/lib/localOcr.ts` — lazy singleton:
  `PaddleOCR.create({ lang: "ch", ocrVersion: "PP-OCRv5", worker: true,
  ortOptions: { backend: "wasm", numThreads: 2 } })`.
  Exposes `recognize(blob|canvas) → { text, avgScore, minScore, boxes }`,
  `status()`, `dispose()`. Single-thread WASM to dodge COOP/COEP in WebView.
- `src/components/Splash.tsx` — first-run gate with download progress
  (MB / %), retry on failure. Mounted in `Popup` shell; blocks routes
  until `status() === "ready"`.

## Modified files

- `src/constants.ts` — add `OCR_MIN_SCORE = 0.7`.
- `src/components/OcrUploadPanel.tsx` — try local first, fallback to
  vision; wire badge; `await ready()` if user clicks before init.
- `src/App.tsx` — warm up OCR beside `KeyBootstrapper.reloadKeys()`;
  silent on cached launches.

## Splash behavior

- First run: blocking gate with real progress + retry. Never a dead end:
  failure offers "Continue with cloud vision".
- Later runs: HTTP-cached models, gate flashes <1s or skips; WASM init
  ~0.5-1.5s silent in background.

## Verification

1. `pnpm build` + vitest text-path suite green.
2. Clean screenshot → "Local OCR" badge, no image tokens.
3. Blurry/empty screenshot → "Cloud vision" badge, correct result.
4. First launch shows download progress; second launch skips gate.
5. Rapid OCR clicks before ready queue on `ready()`, no crash.

## Estimates

Spike ~1 day, wiring ~half day, splash + harden ~half day. Total ~2 days.

## Out of scope

- Dropping vision models entirely (kept as fallback).
- FileField upload reuse (separate task).
- Rust-side OCR.
- `minScore` compound rule (follow-up after calibration data).
