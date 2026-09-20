# Building and Releasing a Tauri v2 App (Reusable Guide)

> Reference doc only — researched from the Terax repo, kept for guidance. App-specific steps live in `updater-implementation-plan.md`.

Researched from this repo (`terax-ai` / `Terax`, Tauri v2 + Vite + React + pnpm + Rust workspace).
Applies to any Tauri v2 app. Special focus: **how to get a Windows build when your dev machine is a Mac.**

> Rule #1: **You cannot produce a Windows installer (`.exe` NSIS / `.msi` WiX) natively on macOS.**
> Tauri's Windows bundler needs the MSVC linker, Windows SDK, WebView2, NSIS, and WiX — all Windows-only.
> Use CI (recommended) or a Windows VM. Do not waste time on `rustup target add x86_64-pc-windows-msvc` on a Mac.

---

## 1. How this app is wired

| Piece | This repo | What to copy for your app |
|---|---|---|
| Tauri version | v2 (`@tauri-apps/cli ^2.11`, `tauri = { version = "2" }`) | Same. v1 instructions differ. |
| Frontend | Vite 8 + React 19, `pnpm build` → `../dist` | Any `frontendDist` your `tauri.conf.json` points at. |
| `beforeBuildCommand` | `pnpm build:cli && pnpm build` | Your frontend build + any sidecar build. |
| `frontendDist` | `../dist` (relative to `src-tauri/`) | Must match your Vite `outDir`. |
| Rust workspace | `src-tauri/` + `crates/terax-cli` + `crates/terax-control-protocol` | Optional; sidecar pattern below works with or without a workspace. |
| Sidecar (`externalBin`) | `bundle.externalBin: ["binaries/terax-cli"]` | See §3. |
| Updater | `createUpdaterArtifacts: true` + `plugins.updater` (pubkey + `latest.json` endpoint) | See §5. |
| Windows bundler | NSIS `currentUser` + `installer-hooks.nsh` + `webviewInstallMode: downloadBootstrapper`; WiX version merged from `tauri.windows.conf.json` | See §2. |
| macOS | `minimumSystemVersion 13.0`, `entitlements.plist`, Apple notarization in CI | Mac-only concern. |
| Linux | `libwebkit2gtk-4.1-0`, `libgtk-3-0` runtime deps; build needs `-dev` packages + `patchelf` | Linux-only concern. |
| Release CI | `.github/workflows/release.yml` — matrix: macOS arm64, macOS x86_64, Ubuntu 22.04, Windows latest, via `tauri-apps/tauri-action@v1` | Template in §6. |

Key config files to read in this repo:

- `src-tauri/tauri.conf.json` — base config, all platforms.
- `src-tauri/tauri.windows.conf.json` — Windows-only merge (`{"bundle":{"windows":{"wix":{"version":"0.9.0"}}}}` + window overrides). Merged with `--config` flag or `tauri-action` config path.
- `src-tauri/tauri.linux.conf.json` — Linux window overrides.
- `src-tauri/build.rs` — fails the release build if the sidecar binary is missing; in dev it strips `externalBin` so `cargo check` still passes.
- `scripts/build-cli.mjs` — builds `terax-cli` for `$TERAX_CLI_TARGET || $CARGO_BUILD_TARGET || rustc host` and copies it to `src-tauri/binaries/terax-cli-<target>[.exe]`.
- `src-tauri/installer-hooks.nsh` — NSIS registry verbs ("Open in Terax").

---

## 2. Prerequisites per OS

### macOS (Apple Silicon / Intel) — builds macOS `.dmg` only

```bash
xcode-select --install
node -v   # >= 22 (this repo: engines.node >= 22, CI uses 24)
pnpm -v   # 11.x (see packageManager field)
rustc -vV # stable, e.g. 1.96.0
cargo install tauri-cli@2 # or use pnpm tauri (this repo: @tauri-apps/cli via pnpm)
```

### Windows 11 — builds Windows `.exe` (NSIS) + `.msi` (WiX)

1. **Node 22+** (LTS), **pnpm 11**, **Rust stable (MSVC toolchain)** via `rustup-init.exe`.
2. **Visual Studio Build Tools** with "Desktop development with C++" workload (MSVC linker + Windows 10/11 SDK). Required — GNU toolchain is not supported by Tauri bundler.
3. **WebView2 Runtime** (usually preinstalled on Win 10/11; Tauri uses `downloadBootstrapper` so the installer fetches it if missing).
4. Tauri pulls NSIS/WiX automatically via `tauri-action` / `tauri build`. For fully offline local builds install [NSIS](https://nsis.sourceforge.io/) + [WiX v3](https://wixtoolset.org/) manually.

### Linux (Ubuntu 22.04 — matches this repo's CI) — builds `.AppImage` / `.deb` / `.rpm`

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libssl-dev patchelf \
  nodejs npm rustc cargo
```

---

## 3. Sidecar pattern (optional — skip if you have no sidecar)

This app ships a helper CLI (`terax-cli`) as a Tauri `externalBin` sidecar. Tauri expects the file at:

```
src-tauri/binaries/<name>-<rust-target-triple>[.exe]
# e.g. binaries/terax-cli-x86_64-pc-windows-msvc.exe
#      binaries/terax-cli-aarch64-apple-darwin
#      binaries/terax-cli-x86_64-unknown-linux-gnu
```

How this repo does it (`scripts/build-cli.mjs` + `src-tauri/build.rs`):

1. `beforeBuildCommand` runs `pnpm build:cli` → `cargo build --locked -p terax-cli --bin terax-cli --target <triple> [--release]` → copies the artifact into `src-tauri/binaries/` with the triple-suffixed name (+ `.exe` on Windows), `chmod +x` on Unix.
2. Target triple resolution order: `$TERAX_CLI_TARGET` → `$CARGO_BUILD_TARGET` → `rustc -vV` host. CI sets `TERAX_CLI_TARGET: ${{ matrix.rust-target }}` so cross macOS legs (`aarch64` vs `x86_64`) build the right sidecar.
3. `build.rs::configure_sidecar()` panics in release if the expected sidecar file is missing/empty ("run pnpm build:cli before packaging"); in dev it clears `bundle.externalBin` via `TAURI_CONFIG` so plain `cargo check` works without a sidecar.

To reuse in your app:

```jsonc
// src-tauri/tauri.conf.json
{ "bundle": { "externalBin": ["binaries/my-helper"] } }
```

```bash
# build sidecar BEFORE tauri build, naming it exactly:
#   src-tauri/binaries/my-helper-<target-triple>[.exe]
cargo build --release -p my-helper --target x86_64-pc-windows-msvc
cp src-tauri/target/x86_64-pc-windows-msvc/release/my-helper.exe \
   src-tauri/binaries/my-helper-x86_64-pc-windows-msvc.exe
```

---

## 4. Local builds (same OS = same target)

```bash
pnpm install --frozen-lockfile

# optional but recommended parity with CI:
pnpm lint && pnpm check-types && pnpm test
cargo check --locked            # run inside src-tauri/
cargo clippy --all-targets --locked -- -D warnings  # src-tauri/

# dev (hot reload):
pnpm tauri dev

# release bundle for YOUR current OS:
pnpm tauri build
# output → src-tauri/target/release/bundle/
#   macOS:   dmg/Terax_*.dmg, macos/Terax.app
#   Windows: nsis/*-setup.exe, msi/*.msi
#   Linux:   appimage/*.AppImage, deb/*.deb, rpm/*.rpm
```

With an extra Tauri config merge (this repo's Windows WiX version):

```bash
pnpm tauri build -- --config src-tauri/tauri.windows.conf.json
```

---

## 5. Updater + signing (needed only if you ship auto-update)

This repo sets `bundle.createUpdaterArtifacts: true`, so every `tauri build` emits `.sig` files next to the installers, and `plugins.updater.endpoints` points at `https://github.com/<org>/<repo>/releases/latest/download/latest.json`.

1. Generate a keypair once: `pnpm tauri signer generate -w ~/.tauri/myapp.key`.
2. Put the **public key** in `tauri.conf.json → plugins.updater.pubkey`.
3. CI holds `TAURI_SIGNING_PRIVATE_KEY` (+ optional password) as secrets; `tauri-action` signs and uploads `latest.json` automatically.
4. Gotcha this repo handles: if you **re-sign or re-upload** an artifact afterward (AppImage wayland-strip, Windows SignPath Authenticode), the old `.sig` is invalid — you must `tauri signer sign <file>` again and patch `latest.json` signatures + URLs. See `release.yml` jobs `Fix AppImage…` and `patch-updater-manifest`.
5. If you don't need auto-update: set `createUpdaterArtifacts: false` and delete the `plugins.updater` block — then no signing keys are needed at all.

---

## 6. Release CI (the canonical way to build Windows from a Mac)

`release.yml` triggers on `push.tags: v*` + manual `workflow_dispatch`, matrix:

| Runner | Args | Produces |
|---|---|---|
| `macos-latest --target aarch64-apple-darwin` | Apple notarization secrets | arm64 `.dmg` |
| `macos-latest --target x86_64-apple-darwin` | Apple notarization secrets | Intel `.dmg` |
| `ubuntu-22.04` | apt deps above | `.AppImage` / `.deb` / `.rpm` |
| `windows-latest` | SignPath Authenticode | NSIS `-setup.exe` + `.msi` |

Minimal reusable workflow for your own Tauri v2 app (no sidecar, no extra signing):

```yaml
name: Release
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
jobs:
  release:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest    args: "--target aarch64-apple-darwin"
          - platform: macos-latest    args: "--target x86_64-apple-darwin"
          - platform: ubuntu-22.04    args: ""
          - platform: windows-latest  args: ""
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v7
      - name: Linux deps
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libssl-dev patchelf
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: pnpm }
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install --frozen-lockfile
      - uses: tauri-apps/tauri-action@v1
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "MyApp ${{ github.ref_name }}"
          releaseDraft: true
          args: ${{ matrix.args }}
```

This repo adds on top: `TERAX_CLI_TARGET` env, `rust-cache`, Apple cert/API secrets, `TAURI_SIGNING_*` updater secrets, AppImage libwayland strip + re-sign, SignPath submit/wait/re-sign for Windows, and a final `patch-updater-manifest` job. Copy those blocks only if you have the same needs.

---

## 7. Building Windows on a Mac — your options

### Option A — GitHub Actions (recommended, what this repo does)

You stay on macOS; GitHub's Windows runner does the real build.

```bash
# 1. Commit everything, ensure CI is green on main.
# 2. Tag and push:
git tag v0.1.0
git push origin v0.1.0
#  — or: gh workflow run Release  (workflow_dispatch, no tag needed for a test run)

# 3. Wait ~10–20 min, then download from:
#    GitHub → Releases → v0.1.0 (draft) → *-setup.exe / *.msi (+ .sig + latest.json)
gh release download v0.1.0 --pattern "*setup.exe" --pattern "*.msi"
```

No Apple/Windows certs needed for a first unsigned test build — set `releaseDraft: true` and skip SignPath/Apple secrets; Windows SmartScreen will warn on install until you add Authenticode signing.

### Option B — Windows 11 VM on your Mac (UTM / Parallels / VMware Fusion)

1. Install UTM (free) or Parallels, create a Windows 11 ARM64 VM (Microsoft offers ARM ISOs; x64 emulation handles Node/Rust fine).
2. Inside the VM install: Node 24 + pnpm 11 + Rust stable (MSVC) + VS Build Tools C++ workload + WebView2 Runtime.
3. Share the repo folder into the VM (or `git clone` inside it), then:

```powershell
pnpm install --frozen-lockfile
pnpm tauri build   # or: pnpm build:cli ; pnpm build ; pnpm tauri build
# → src-tauri\target\release\bundle\nsis\*-setup.exe, msi\*.msi
```

Copy the installers back to macOS for distribution/testing.

### Option C — Borrow / rent a Windows machine

Any Windows 10/11 box with the §2 prerequisites works: `git clone`, `pnpm install`, `pnpm tauri build`. Self-hosted runners use the same steps.

### What NOT to try

- `rustup target add x86_64-pc-windows-msvc` on macOS then `tauri build --target …` → fails at link time (no MSVC linker / Windows SDK) and the bundler can't emit NSIS/MSI anyway.
- MinGW/`x86_64-pc-windows-gnu` cross-compiles → unsupported by Tauri v2 bundler, WebView2, and WiX/NSIS tooling.
- Docker `windows-server` images on a Mac → no Windows containers on macOS; only Linux containers, which can't run the Windows toolchain.

---

## 8. Version-bump checklist (this repo)

1. Bump `version` in **three** places: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (`[package]` + `[workspace.package]`) — plus `tauri.windows.conf.json → bundle.windows.wix.version` (WiX product version).
2. `pnpm install --frozen-lockfile && pnpm build && pnpm tauri build` locally (your OS) as a smoke test.
3. Commit → push → `git tag vX.Y.Z && git push origin vX.Y.Z` → CI builds all four platform legs → review the **draft** release → publish.
4. Updater clients poll `latest.json` at the URL in `plugins.updater.endpoints`; keep that path stable.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `release sidecar … is missing` (build.rs panic) | You ran `tauri build` without `pnpm build:cli` first, or `TERAX_CLI_TARGET` doesn't match the `--target`. Build the sidecar for the exact triple. |
| Windows build fails on `link.exe` / `MSVC` | Missing VS Build Tools C++ workload. Install it; ensure `rustup default stable-msvc`. |
| NSIS/MSI produced but SmartScreen warns | Expected for unsigned builds. Add Authenticode (SignPath in this repo) for production. |
| `.sig` / `latest.json` mismatch after re-upload | Any byte change invalidates minisign signatures. Re-run `tauri signer sign` and patch `latest.json` (see `patch-updater-manifest` job). |
| Linux AppImage white/blank window on modern distros | Stale bundled `libwayland-*` vs host Mesa. This repo strips them and repacks with `appimagetool` — copy that step if you hit `EGL_BAD_PARAMETER`. |
| macOS "damaged / unidentified developer" | Missing Apple notarization (`APPLE_CERTIFICATE`, `APPLE_API_*` secrets in CI). Local unsigned builds need `xattr -cr` / right-click Open. |
