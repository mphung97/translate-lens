# Overlay Box Visualizer Plan

> Status: **NOT IMPLEMENTED YET** — approved spec, awaiting `build` command.
> Spec UI: `mockup/result-box-popover.html` (v3, single image, no side-by-side).
> Cost rule: all boxes translated in **one** batch API call; clicks read from cache (zero calls per click).

## Goal

After local OCR, overlay clickable boxes on the single uploaded image using returned `poly` coordinates. Click box (or rail tab, or J/K keys) shows that region's translation docked below the image.

## Decisions locked

1. Layout clones mockup v3: top badge + lang pill, `img-strip` (image + overlay), `box-rail` tabs, docked `result-card`, bottom `Quét lại / Copy tất cả`.
2. Coordinate math: Paddle returns pixels + `result.image.{width,height}` → render `% = x/imgW*100`. (Mockup's 0–1000 `/10` math does not apply to real SDK output.)
3. SDK type fix: `poly` is `[x,y][]` tuples (`dist/models/common.d.ts`), not `{x,y}[]` as `src/lib/localOcr.ts:18` claims. Normalize once in `summarize()`.
4. Batch translation: new `translateBoxes(texts)` — one numbered-list prompt, one `Output.object({items:[{id,translatedText,pinyin}]})` call, match by `id`. On parse/length mismatch: discard batch, keep Text view. No per-click retry (cost cap).
5. Cloud fallback (no boxes) renders today's 3-card Text view unchanged.

## Steps

1. Types + store (~30 min)
   - `src/lib/localOcr.ts`: normalize `poly` tuples → `{x,y}[]`; expose `image {width,height}` on result.
   - `src/stores/translation.tsx`: add `imageUrl, imageW/H, fileName, boxes[{poly,text,score}], boxTranslations[idx]={vi,pinyin}, selectedIdx`. Revoke object URL on new upload.
   - Verify: typecheck clean.
2. Batch translate (~45 min)
   - `src/lib/translate.ts`: add `translateBoxes(texts, targetLanguage, provider, apiKey)`.
   - Cap input at `MAX_INPUT_CHARS`; strict id-echo prompt + `safeParse` check.
   - Verify: unit-check 3-box input → 3 aligned outputs, 1 call.
3. Upload flow (~20 min)
   - `src/components/OcrUploadPanel.tsx`: on local pass (`avgScore >= OCR_MIN_SCORE`), build `imageUrl` from `prepared.bytes`, keep SDK dims, `Promise.all([translate(full), translateBoxes(boxes)])`, then navigate to result.
   - Verify: N boxes → exactly 2 text LLM calls, 0 image tokens.
4. Overlay component (~1h)
   - New `src/components/OcrBoxesOverlay.tsx`: `preview > stage > img + overlay > button.bbox` with `%` coords; `bbox-tag #NN`; `low` dotted if score < 0.85; `mini-pop` hover; `boxes` toggle + `+/-` zoom; `preview-cap` counter.
   - Verify: boxes align on resize; popover never overflows.
5. Rail + result card (~1h)
   - `ResultPanel.tsx`: `box-rail` tabs synced both ways; docked card (title, hanzi ruby, pinyin, VI, coords, conf foot); reuse `CopyButton`; keys `J/K/←/→` step, `Enter` copy.
   - Verify: click/hover/keys all work with zero network after batch.
6. Fallbacks (~20 min)
   - Empty boxes → Text tab; image `max-h-[320px] object-contain` in 500×700 popup.
   - Verify: `pnpm build` clean; cloud path unchanged.

## Verification checklist

- [ ] `pnpm build` clean
- [ ] Screenshot → boxes overlay aligns at any width
- [ ] Click every box → correct region result, Network tab shows nothing new
- [ ] Cloud fallback → old 3-card view
- [ ] Zoom / toggle / J/K / Enter all work

## Estimates

Total ~3.5h.

## Out of scope

- Side-by-side viz (`OcrVisualizer.toBlob`) — rejected.
- Per-click translate — rejected (cost).
- Rust-side OCR, 0–1000 coord migration, TTS wiring (mockup button is visual only).
