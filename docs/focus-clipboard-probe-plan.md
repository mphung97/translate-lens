# Focus Clipboard Probe Plan

## Goal

Detect clipboard image readiness on window focus/blur in
`src/components/OcrUploadPanel.tsx` (button block L216-235).
Enable the OCR button only when an image is ready. No auto-OCR.

## State

- Status: approved, option A locked, not yet implemented.
- Prior work done: `prepareImageForOcr` + AI SDK `image` part switch.

## API (Tauri v2)

- `getCurrentWindow().onFocusChanged(({ payload: focused }) => ...)` returns `UnlistenFn`.
- `onFocusChanged(true)` → run probe. `onFocusChanged(false)` → set `hasImage=false`, no probe.
- Browser fallback (vite without Tauri): `document.visibilitychange` → probe when visible.
- Follow existing `src/lib/window.ts` `isTauri()` guard pattern.

## New helper

New file `src/lib/clipboard.ts`:

```ts
export async function checkClipboardImage(): Promise<{ w: number; h: number } | null>
```

- Calls `readImage()` from `@tauri-apps/plugin-clipboard-manager` + `size()`.
- Returns `{ w, h }` on success, `null` on throw (empty clipboard).
- Skips `rgba()` and `prepareImageForOcr` — size check only, lightweight.
- No error toast from probe path.

## State changes (colocated, no new store file)

Extend `OcrUploadState` in `OcrUploadPanel.tsx`:

```ts
interface OcrUploadState {
  busy: boolean;
  error: string;
  hasImage: boolean;
  clipW: number;
  clipH: number;
  checking: boolean;
}
```

- `checking` guards overlapping probes (spam-focus → single probe).
- `handleClipboardOcr` keeps full flow: `readImage` → `rgba/size` →
  `prepareImageForOcr` → `translate`. Probe never triggers OCR.
- Banner (L210-212, currently hardcoded `1240 × 380px`) renders
  real dims when `hasImage`, empty state otherwise.
- Button disabled unless `hasImage && !busy && !checking`.
- Probe failures stay silent; only manual OCR clicks surface
  `FALLBACK_CLIPBOARD_IMAGE_ERROR`.

## Lifecycle

1. `onMount`: initial `probe()` + subscribe `onFocusChanged`.
2. Focus (`focused=true`): `probe()` if not `busy`/`checking`.
3. Blur (`focused=false`): set `hasImage=false`, keep dims for display.
4. `onCleanup`: call `unlisten()`.

## Verification

1. `pnpm build` passes.
2. Copy image → focus app → banner shows real dims, button enabled.
3. Copy text → focus app → empty state, button disabled, no error toast.
4. Rapid focus spam → single probe, no overlap.

## Estimate

About 45 min total: helper 10, state 10, lifecycle 15, verify 10.

## Out of scope

- Auto-OCR on focus.
- FileField upload path reuse (separate task).
- Rust-side clipboard handling.
