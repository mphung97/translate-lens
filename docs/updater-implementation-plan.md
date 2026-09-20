# Updater + Release Implementation Plan (Translate Lens v2)

Scope locked: macOS (arm64 + x64) + Windows CI, with in-app updater.
Out of scope: Linux, sidecar (section 3 of TERAX-BUILD-AND-RELEASE.md), NSIS hooks, `tauri.*.conf.json` merges.

Repo: `mphung97/translate-lens` (`https://github.com/mphung97/translate-lens.git`, `origin/main`, default branch `main`).

Source guide: `docs/TERAX-BUILD-AND-RELEASE.md` (sections 1, 2, 4-8 apply; section 3 skipped).

## 0. Starting state (verified 2026-09-20)

- Tauri v2, Vite 6 + SolidJS, `pnpm build` → `../dist` (wiring correct).
- Toolchain OK: Node 24.12, pnpm 11.5, Rust 1.96, host `aarch64-apple-darwin`.
- Git: `origin` = `https://github.com/mphung97/translate-lens.git`, branch `main` tracking `origin/main`, clean except local WIP (`src/components/OcrUploadPanel.tsx`, `src/constants.ts`, `src/lib/*`, `tsconfig.json`) + untracked `docs/`, `mockup/*.html`.
- Versions locked at `0.1.0` in `package.json:3`, `src-tauri/tauri.conf.json:4`, `src-tauri/Cargo.toml:3`.
- Missing: updater plugin, updater config, `.github/workflows/` (confirmed absent), signing keys.
- Update UI: none yet — will be 1 row in `ByokSettingsPanel.tsx` Card 1.

## 1. Add updater plugin (~20 min) — DONE 2026-09-20

1. `src-tauri/Cargo.toml:20`: add `tauri-plugin-updater = "2"`.
2. `package.json:14`: add `@tauri-apps/plugin-updater` (same major as `@tauri-apps/api` `^2`).
3. `src-tauri/src/lib.rs:7-17`: register `.plugin(tauri_plugin_updater::Builder::new().build())` alongside existing plugins.
4. `src-tauri/capabilities/default.json:8-23`: add `"updater:default"` to `permissions`.
5. Verify: `pnpm install` → `cargo check` in `src-tauri/` → `pnpm build`.
6. Extra (Tauri v2 API split): `relaunch` lives in `@tauri-apps/plugin-process`, so also added `tauri-plugin-process = "2"` (Cargo) + `@tauri-apps/plugin-process@^2` (npm) + `.plugin(tauri_plugin_process::init())` + `"process:default"`. Pinned `@tauri-apps/plugin-updater@2.12.0` to match the Rust crate (build fails on major/minor mismatch).
7. Verified: `cargo check` passes, `pnpm build` passes (3.3s).

## 2. Configure updater in `tauri.conf.json` (~10 min) — DONE 2026-09-20

1. Set `bundle.createUpdaterArtifacts: true`.
2. Add block (repo resolved — no placeholder):
   ```jsonc
   { "plugins": { "updater": {
     "active": true,
     "dialog": true,
     "endpoints": ["https://github.com/mphung97/translate-lens/releases/latest/download/latest.json"],
     "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDg3MzE5MDhEM0Y3NDcwMUQKUldRZGNIUS9qWkF4aC9EVDdLSlhpTlk5QVZiM2MxTGdsNHkzNmN1SDd4S2lrOVJOU3VxeitHNncK"
   } } }
   ```
3. Verify: `pnpm tauri build` (macOS arm64) emits `.sig` next to the `.app.tar.gz` updater bundle (not next to the `.dmg` — macOS updater artifact is the tarball). Verified 2026-09-20: `Translate Lens_0.1.0_aarch64.dmg` + `Translate Lens.app.tar.gz` + `Translate Lens.app.tar.gz.sig`.
4. Signing env that works headless: `TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/translate-lens.key)"` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""`. (`TAURI_SIGNING_PRIVATE_KEY_PATH` alone is ignored by this CLI; empty password var skips the TTY prompt.)

## 3. Signing keys (~10 min) — HALF DONE 2026-09-20

1. Run once: `pnpm tauri signer generate -w ~/.tauri/translate-lens.key` — DONE (`--ci`, no password; pubkey + private key at `~/.tauri/translate-lens.key` / `.pub`).
2. Paste public key into `pubkey` field from step 2 — DONE (see §2).
3. Add repo secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — MANUAL (do at `https://github.com/mphung97/translate-lens/settings/secrets/actions`; value = contents of `~/.tauri/translate-lens.key`, password empty). Needed before CI can sign.
4. Verify: local sign proven via `pnpm tauri build` emitting a valid `.sig` (see §2.3).

## 4. Release CI — macOS + Windows, draft (~15 min) — DONE 2026-09-20

New file `.github/workflows/release.yml` — CREATED 2026-09-20 (uses `actions/checkout@v4`, `pnpm/action-setup@v4`, `setup-node@v4` Node 24 + pnpm cache, `dtolnay/rust-toolchain@stable`, `tauri-apps/tauri-action@v1`):
Fixes applied after first red runs: `packageManager: pnpm@11.5.2` (action-setup requires a version), macOS `rustup target add` step (Intel leg), job `permissions: contents: write` + repo setting flip (release creation).
Draft contains 13 assets: `latest.json`, arm64 `.dmg` + `.app.tar.gz` + `.sig`, x64 `.dmg` + `.app.tar.gz` + `.sig`, Windows `*-setup.exe` + `.sig`, `*.msi` + `.sig`, 2× source archives.

- Triggers: `push.tags: v*` + `workflow_dispatch`.
- Matrix (3 legs): `macos-latest --target aarch64-apple-darwin`, `macos-latest --target x86_64-apple-darwin`, `windows-latest` (no args).
- Steps per leg: checkout → pnpm setup → Node 24 + pnpm cache → Rust stable → `pnpm install --frozen-lockfile` → `tauri-apps/tauri-action@v1` with `tagName: github.ref_name`, `releaseDraft: true`.
- Pass `TAURI_SIGNING_PRIVATE_KEY*` via `env` on the tauri-action step.
- First run: Apple notarization + SignPath intentionally empty (unsigned draft; SmartScreen/dev warning expected).
- Verify: manual dispatch goes green; draft release contains 2× `.dmg`, `*-setup.exe`, `*.msi`, `latest.json` + `.sig` files. DONE 2026-09-20 — all green, 13 assets. NOTE: CI created the draft under an `untagged-<sha>` tag; retarget the draft to `v0.1.0` in the UI before publishing (updater polls `releases/latest`, which only resolves to published non-draft releases).

## 5. App-version row in `ByokSettingsPanel.tsx` (~25 min) — CODE DONE, RUNTIME CHECK PENDING

Location: Card 1 (Core prefs), below Always-on-top switch, same row pattern — DONE 2026-09-20.

1. New `src/lib/updater.ts`: `getAppVersion()`, `checkForUpdate()` → `{ available, version }`, `installAndRelaunch()`. Component never touches `invoke`/IPC directly.
2. Extend colocated `ByokState` store (`ByokSettingsPanel.tsx:28`): add `version`, `updateBusy`, `updateMsg` + actions `loadVersion` (in `onMount`), `handleCheck`, `handleInstall`.
3. UI: `Separator` + `flex items-center justify-between` row. Left: label "Phiên bản (App version)", `v{version}`, status line. Right: single `Button` cycling `Kiểm tra cập nhật` → `Cài đặt vX.Y.Z` → `Đang cài...`, disabled while `updateBusy`. Match existing `cn([...])` class-order style.
4. No auto-check on boot for v0.1.0 (manual button only).
5. Verify: `pnpm dev` → row renders → check with no update shows "Đã là bản mới nhất" → with staged draft update shows install label → install + relaunch works. PENDING — needs `pnpm dev` eyeball check + a published draft release for end-to-end.

## 6. Version-bump + ship checklist (~5 min per release)

1. Bump same version in `package.json:3`, `src-tauri/tauri.conf.json:4`, `src-tauri/Cargo.toml:3` (currently all `0.1.0`).
2. Smoke: `pnpm build` + local `pnpm tauri build`.
3. Commit on `main` → push to `origin` → `git tag vX.Y.Z && git push origin vX.Y.Z` → wait for CI → review draft at `https://github.com/mphung97/translate-lens/releases` → publish.
4. Verify: `https://github.com/mphung97/translate-lens/releases/latest/download/latest.json` returns valid JSON; app's check button finds the new version.

## Explicitly skipped (from TERAX-BUILD-AND-RELEASE.md)

- section 3 sidecar pattern — no helper CLI.
- Linux leg, apt deps, AppImage wayland-strip.
- `installer-hooks.nsh`, `tauri.windows/linux.conf.json` merges.
- Apple notarization + SignPath Authenticode — defer until first signed production release.

## Done = all green (status 2026-09-20)

- [x] `cargo check` + `pnpm build` pass.
- [x] Local macOS `.dmg` + `.sig` produced (`Translate Lens_0.1.0_aarch64.dmg`, `.app.tar.gz` + `.app.tar.gz.sig`).
- [x] CI draft has 4 installers + valid `latest.json`. Draft has 13 assets incl. `latest.json`; pending retarget to `v0.1.0` + publish.
- [ ] Settings row shows version, check + install works end-to-end. Code done (`src/lib/updater.ts` + Card 1 row); test after publish: install 0.1.0 dmg, bump to 0.1.1, publish, press check.

Known pre-existing issue (not from this work): `pnpm exec tsc --noEmit` fails on `tsconfig.json:18` (`"ignoreDeprecations": "6.0"` invalid for TS 5.6.2 — local WIP predates this change).

Next: open github.com/mphung97/translate-lens/settings/secrets/actions, add TAURI_SIGNING_PRIVATE_KEY (paste ~/.tauri/translate-lens.key) — then say the word and I walk through the first draft release.