# Error Screen Scope 1 Plan

## Goal

One global crash screen for render-blocking failures. No per-error pages.
Inline/ recoverable errors stay where they are (Scope 2).

## State

- Status: approved, Scope 1 locked, not yet implemented.
- Decision locked: reload strategy is 3-tier —
  Try again (instant remount) → Reload (`location.reload`) → Relaunch (Tauri `plugin-process`).
- `tauri-plugin-process` is NOT installed yet (checked `Cargo.toml`, `capabilities/default.json`).

## Assumptions

1. `ErrorBoundary` from `solid-js` is available (`solid-js@1.9.3`).
2. Screen must render outside Tauri too (plain `pnpm dev` must not blank).
3. No logging service in Scope 1 — copy-to-clipboard only.
4. Async/IPC/AI errors stay inline; boundary catches render errors only.

## Non-goals (Scope 2)

- Error-code split in `src/lib/translate.ts:141` (NETWORK / UNAUTH / RATE_LIMIT / TIMEOUT).
- `INVALID_RESPONSE` masking fix (`translate.ts:152-155`).
- `secrets_get_all` error swallowing (`src-tauri/src/secrets.rs:44-56`).
- Capability gaps (`allow-read-text`, window show/focus, FS scoped access).
- `getContext("2d")!` null checks in `src/lib/image.ts`.

## New file 1: `src/components/FatalErrorScreen.tsx` (~80 lines)

Props:

```tsx
interface FatalErrorScreenProps {
  error: unknown;
  reset: () => void;
}
```

- Layout follows `src/components/Popup.tsx:39-48`: `cn([...])` grouped classes,
  `font-mono`, `bg-bg rounded-[10px]`, `p-3`. No Tauri APIs on import/render path.
- Shows: title ("Something went wrong"), `messageOf(error)`, collapsed
  `<details>` with stack trace (first ~20 lines).
- 3 buttons in order:
  1. Try again → `reset()`
  2. Reload window → `window.location.reload()`
  3. Restart app → `restartApp()` (see below), `try/catch` fallback to reload
- Copy details button: `navigator.clipboard.writeText` first, Tauri
  `plugin-clipboard-manager` fallback, silent fail ok here.
- `messageOf`: `error instanceof Error ? error.message : String(error ?? "Unknown error")`.

## New file 2: `src/components/AppErrorBoundary.tsx` (~30 lines)

```tsx
import { ErrorBoundary } from "solid-js";
import type { ParentProps } from "solid-js";
```

- Wraps children in `<ErrorBoundary fallback={(err, reset) => <FatalErrorScreen ... />} />`.
- Holds `resetKey` signal; `reset()` increments key to force-remount subtree.
- Key the inner wrapper `<div key={resetKey()}>` or remount `MemoryRouter` via key.
- No `invoke`/IPC in this file (repo rule: side effects in `src/lib/`).

## New helper: `src/lib/restartApp.ts` (~20 lines)

```ts
export async function restartApp(): Promise<void>
```

- Follow existing `src/lib/window.ts` `isTauri()` guard pattern.
- If not Tauri → `window.location.reload()`, return.
- Else `await import("@tauri-apps/plugin-process").then(m => m.relaunch())`.
- Caller wraps in `try/catch` → fallback `window.location.reload()`.

## Edit 1: `src/App.tsx:20-43` (+6 lines)

- Wrap `<TranslationProvider><MemoryRouter…>` inside `<AppErrorBoundary>`.
- Keep `PreferencesProvider` OUTSIDE/above so Reset-prefs action can clear `localStorage`.

```tsx
<PreferencesProvider>
  <KeyBootstrapper>
    <AppErrorBoundary>
      <TranslationProvider>
        ...
      </TranslationProvider>
    </AppErrorBoundary>
  </KeyBootstrapper>
</PreferencesProvider>
```

## Edit 2: `src/index.tsx:6` (+8 lines)

- Null-guard `document.getElementById("root")`; if missing, render plain
  fallback div with static message. Never throw — last line of defense.

## Edit 3: harden 2 lines so the screen itself cannot crash

- `src/lib/resizeWindow.ts:5` — lazy `getCurrentWindow()` inside fn +
  `isTauri()` guard + `try/catch` around `setSize`. Extract `isTauri()` to
  shared helper or import from `src/lib/window.ts` (export it there first).
- `src/components/Popup.tsx:22` — add `.catch(() => {})` to the
  `queueMicrotask(resize)` path.

## Dependency: `tauri-plugin-process`

1. `pnpm add @tauri-apps/plugin-process`
2. `src-tauri/Cargo.toml`: add `tauri-plugin-process = "2"`
3. `src-tauri/src/lib.rs`: add `.plugin(tauri_plugin_process::init())`
4. `src-tauri/capabilities/default.json`: add `"process:allow-relaunch"`
   (verify exact permission id against installed plugin version; use
   `process:default` only if the scoped id does not exist in that version).
5. Browser build must still compile without Tauri — dynamic `import()` only.

## Verification

1. `pnpm build` passes (frontend) + `cargo check` in `src-tauri/` passes.
2. Throw test: temporary `throw new Error("boom")` in `ResultPanel`,
   open `/result` → screen shows (not blank). Remove after.
3. Missing-root test: rename `#root` in `index.html` → fallback message shows.
4. Browser test: `pnpm dev` without Tauri → no blank screen on load.
5. Tauri test: `pnpm tauri dev` → Restart button calls `relaunch()`;
   Reload button calls `location.reload()`.

## Time estimate

- Screen + boundary + wiring: ~1 hr 15 min.
- `restartApp` + process plugin + capabilities: ~30 min.
- Verification (5 checks above): ~15 min.
- Total: ~2 hrs.
