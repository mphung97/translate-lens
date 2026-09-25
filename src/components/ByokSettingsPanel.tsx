import { useEffect, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { setAlwaysOnTop, isAlwaysOnTop } from "@/lib/window";
import {
  checkForUpdate,
  getAppVersion,
  installAndRelaunch,
} from "@/lib/updater";
import {
  clearKey,
  setKey,
  type ByokProviderId,
} from "@/lib/secrets";
import { usePreferences } from "@/stores/preferences";
import Badge from "./Badge";

import { BYOK_LANGUAGES as LANGUAGES, BYOK_PROVIDERS as PROVIDERS, IDLE_BYOK_STATUS } from "@/constants";

export interface ByokStatus {
  kind: "idle" | "ok" | "err";
  msg: string;
}

interface ByokState {
  provider: ByokProviderId;
  apiKey: string;
  savedKey: string;
  hasStored: Record<ByokProviderId, boolean>;
  revealed: boolean;
  busy: boolean;
  status: ByokStatus;
  alwaysOnTop: boolean;
  version: string;
  updateBusy: boolean;
  updateMsg: string;
  updateAvailable: boolean;
  latestVersion: string;
}

const IDLE: ByokStatus = IDLE_BYOK_STATUS;

export default function ByokSettingsPanel() {
  const prefs = usePreferences();
  const [state, setState] = useState<ByokState>({
    provider: prefs.preferences().byokProvider,
    apiKey: "",
    savedKey: "",
    hasStored: { groq: false, openrouter: false },
    revealed: false,
    busy: false,
    status: IDLE,
    alwaysOnTop: false,
    version: "",
    updateBusy: false,
    updateMsg: "",
    updateAvailable: false,
    latestVersion: "",
  });

  const dirty = state.apiKey !== state.savedKey;

  function loadProvider(p: ByokProviderId) {
    const k = prefs.apiKeys()[p];
    setState((s) => ({ ...s, apiKey: k ?? "", savedKey: k ?? "", status: IDLE }));
  }

  function refreshPresence() {
    const all = prefs.apiKeys();
    setState((s) => ({
      ...s,
      hasStored: {
        groq: !!all.groq,
        openrouter: !!all.openrouter,
      },
    }));
  }

  function selectProvider(p: ByokProviderId) {
    if (p === state.provider) return;
    setState((s) => ({ ...s, provider: p, revealed: false }));
    prefs.setByokProvider(p);
    const k = prefs.apiKeys()[p];
    setState((s) => ({ ...s, apiKey: k ?? "", savedKey: k ?? "", status: IDLE }));
  }

  function editKey(v: string) {
    setState((s) => ({ ...s, apiKey: v, status: IDLE }));
  }

  function toggleRevealed() {
    setState((s) => ({ ...s, revealed: !s.revealed }));
  }

  async function handleSave() {
    const p = state.provider;
    setState((s) => ({ ...s, busy: true }));
    try {
      const trimmed = state.apiKey.trim();
      if (trimmed) {
        await setKey(p, trimmed);
        prefs.setApiKeysInMemory({ ...prefs.apiKeys(), [p]: trimmed });
        setState((s) => ({
          ...s,
          savedKey: trimmed,
          status: { kind: "ok", msg: "Đã lưu vào Keychain" },
          hasStored: { ...s.hasStored, [p]: true },
        }));
      } else {
        await clearKey(p);
        prefs.setApiKeysInMemory({ ...prefs.apiKeys(), [p]: null });
        setState((s) => ({
          ...s,
          savedKey: "",
          status: { kind: "ok", msg: "Đã xóa key khỏi Keychain" },
          hasStored: { ...s.hasStored, [p]: false },
        }));
      }
    } catch (e) {
      setState((s) => ({ ...s, status: { kind: "err", msg: String(e) } }));
    } finally {
      setState((s) => ({ ...s, busy: false }));
    }
  }

  async function handleAlwaysOnTop(v: boolean) {
    setState((s) => ({ ...s, alwaysOnTop: v }));
    try {
      await setAlwaysOnTop(v);
    } catch (e) {
      setState((s) => ({ ...s, alwaysOnTop: !v, status: { kind: "err", msg: String(e) } }));
    }
  }

  async function loadVersion() {
    try {
      setState((s) => ({ ...s, version: "loading" }));
      const v = await getAppVersion();
      setState((s) => ({ ...s, version: v }));
    } catch {
      setState((s) => ({ ...s, version: "0.1.0" }));
    }
  }

  async function handleCheck() {
    if (state.updateBusy) return;
    setState((s) => ({ ...s, updateBusy: true, updateMsg: "" }));
    try {
      const r = await checkForUpdate();
      if (r.available) {
        setState((s) => ({
          ...s,
          updateAvailable: true,
          latestVersion: r.version ?? "",
          updateMsg: `Có bản mới v${r.version ?? ""}`,
        }));
      } else {
        setState((s) => ({ ...s, updateAvailable: false, updateMsg: "Đã là bản mới nhất" }));
      }
    } catch (e) {
      setState((s) => ({ ...s, updateMsg: String(e) }));
    } finally {
      setState((s) => ({ ...s, updateBusy: false }));
    }
  }

  async function handleInstall() {
    if (state.updateBusy) return;
    setState((s) => ({ ...s, updateBusy: true, updateMsg: "" }));
    try {
      const ok = await installAndRelaunch();
      if (!ok) setState((s) => ({ ...s, updateAvailable: false, updateMsg: "Đã là bản mới nhất" }));
    } catch (e) {
      setState((s) => ({ ...s, updateMsg: String(e) }));
    } finally {
      setState((s) => ({ ...s, updateBusy: false }));
    }
  }

  useEffect(() => {
    refreshPresence();
    loadProvider(state.provider);
    void loadVersion();
    void isAlwaysOnTop()
      .then((v) => setState((s) => ({ ...s, alwaysOnTop: v })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = PROVIDERS.find((p) => p.id === state.provider)!;
  const selectedLang =
    LANGUAGES.find((l) => l.value === prefs.preferences().targetLanguage) ??
    LANGUAGES[0];

  return (
    <div className={cn(["flex flex-col gap-3.5", "font-sans"])}>
      {/* Status header */}
      <div className={cn(["flex items-center justify-between"])}>
        <div className={cn(["flex items-center gap-2"])}>
          <Badge variant="success" dot>
            SETTINGS · BYOK
          </Badge>
          <Badge>CONFIG MODE</Badge>
        </div>
      </div>

      {/* Card 1: Core prefs */}
      <div
        className={cn([
          "p-3.5",
          "rounded-xl",
          "bg-panel border border-main/8",
          "flex flex-col gap-3",
        ])}
      >
        <div className={cn(["flex items-center justify-between gap-2"])}>
          <div>
            <span
              className={cn([
                "block",
                "text-xs font-bold tracking-tight",
                "text-main",
                "font-mono",
              ])}
            >
              Ngôn ngữ đích (Target Language)
            </span>
            <p className={cn(["text-[11px]", "text-ink"])}>
              Ngôn ngữ mặc định khi tra nhanh
            </p>
          </div>
          <div
            className={cn([
              "inline-flex items-center justify-between gap-2",
              "min-w-[150px]",
              "py-1.5 pl-2.5 pr-2",
              "rounded-lg",
              "border border-main/12",
              "bg-bg text-main",
              "text-xs font-semibold",
              "font-mono",
              "opacity-60",
            ])}
            aria-label="Target language"
          >
            <span className={cn(["truncate"])}>{selectedLang.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-sub" />
          </div>
        </div>

        <div className={cn(["h-px", "bg-main/6", "border-0"])} />

        <div className={cn(["flex items-center justify-between gap-2"])}>
          <div>
            <span
              className={cn([
                "block",
                "text-xs font-bold tracking-tight",
                "text-main",
                "font-mono",
                "select-none",
              ])}
            >
              Luôn nổi trên màn hình (Always on top)
            </span>
            <p className={cn(["text-[11px]", "text-ink"])}>
              Ghim cửa sổ popup trên tất cả ứng dụng
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.alwaysOnTop}
            onClick={() => handleAlwaysOnTop(!state.alwaysOnTop)}
            className={cn([
              "relative shrink-0",
              "w-10 h-5",
              "rounded-full",
              "cursor-pointer",
              "border-0",
              "transition-colors",
              "bg-sub-alt",
              state.alwaysOnTop && "bg-caret",
            ])}
          >
            <span
              className={cn([
                "absolute top-[2px] left-[2px]",
                "block w-4 h-4",
                "rounded-full",
                "bg-paper border border-main/15",
                "transition-transform",
                state.alwaysOnTop && "translate-x-5",
              ])}
            />
          </button>
        </div>

        <div className={cn(["h-px", "bg-main/6", "border-0"])} />

        <div className={cn(["flex items-center justify-between gap-2"])}>
          <div>
            <span
              className={cn([
                "block",
                "text-xs font-bold tracking-tight",
                "text-main",
                "font-mono",
                "select-none",
              ])}
            >
              Phiên bản (App version){" "}
              {state.version && state.version !== "loading" && (
                <span className={cn(["text-sub"])}>v{state.version}</span>
              )}
            </span>
            <p className={cn(["text-[11px]", "text-ink"])}>
              {state.updateMsg || "Kiểm tra và cài bản mới"}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              state.updateAvailable ? void handleInstall() : void handleCheck()
            }
            disabled={state.updateBusy}
            className={cn([
              "px-3 py-1.5",
              "rounded-lg",
              "bg-caret hover:bg-caret/90 text-main",
              "border-0",
              "text-xs font-bold tracking-wide",
              "font-mono",
              "inline-flex items-center gap-1",
              "transition-colors cursor-pointer",
              "disabled:opacity-50 disabled:cursor-wait",
            ])}
          >
            {!state.updateBusy
              ? state.updateAvailable
                ? `Cài đặt v${state.latestVersion}`
                : "Kiểm tra cập nhật"
              : "Đang cài..."}
          </button>
        </div>
      </div>

      {/* Card 2: BYOK */}
      <div
        className={cn([
          "p-3.5",
          "rounded-xl",
          "bg-panel border border-main/8",
          "flex flex-col gap-3",
        ])}
      >
        <div
          className={cn([
            "flex items-center justify-between",
            "pb-2",
            "border-b border-main/6",
          ])}
        >
          <div className={cn(["flex items-center gap-1.5"])}>
            <span className={cn(["w-1.5 h-1.5", "rounded-full", "bg-caret"])} />
            <span
              className={cn([
                "text-xs font-bold tracking-tight uppercase",
                "text-main",
                "font-mono",
              ])}
            >
              Cấu hình AI API Key (BYOK)
            </span>
          </div>
          <span
            className={cn([
              "px-1.5 py-0.5",
              "rounded",
              "bg-bg text-chip",
              "border border-main/8",
              "text-[9px] font-bold",
              "font-mono",
            ])}
          >
            SECURE & LOCAL
          </span>
        </div>

        <div>
          <span
            className={cn([
              "block mb-1.5",
              "text-[11px] font-semibold",
              "text-ink",
              "font-mono",
            ])}
          >
            Nhà cung cấp AI:
          </span>
          <div className={cn(["grid grid-cols-4 gap-1.5", "font-mono text-xs"])}>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-label={p.label}
                aria-pressed={p.id === state.provider}
                onClick={() => selectProvider(p.id)}
                className={cn([
                  "relative",
                  "py-1 px-2",
                  "rounded-lg",
                  "border",
                  "text-center",
                  "transition-colors cursor-pointer outline-none",
                  "bg-sub-alt text-main font-medium border-main/6 hover:bg-sub-alt/80",
                  "focus-visible:ring-1 focus-visible:ring-caret",
                  p.id === state.provider &&
                    "bg-main text-bg font-bold border-main",
                ])}
              >
                {p.label}
                {state.hasStored[p.id] && (
                  <span
                    className={cn([
                      "absolute top-1 right-1",
                      "w-1.5 h-1.5",
                      "rounded-full",
                      "bg-caret",
                    ])}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn([
            "flex items-center justify-between",
            "px-2.5 py-1.5",
            "rounded-lg",
            "bg-bg border border-main/6",
            "text-[11px]",
            "font-mono",
          ])}
        >
          <span className={cn(["flex flex-col gap-0.5", "text-ink"])}>
            <span>
              Text: <strong className={cn(["text-main"])}>{active.models.text}</strong>
            </span>
          </span>
          <span className={cn(["text-[10px] font-semibold", "text-caret-deep"])}>
            {active.note}
          </span>
        </div>

        <div>
          <label
            className={cn([
              "block mb-1",
              "text-[11px] font-medium",
              "text-ink",
              "font-mono",
            ])}
          >
            Khóa API {active.label}:
          </label>
          <div className={cn(["relative", "flex items-center"])}>
            <input
              type={state.revealed ? "text" : "password"}
              placeholder={`sk-... (${active.label})`}
              value={state.apiKey}
              onChange={(e) => editKey(e.target.value)}
              className={cn([
                "w-full",
                "py-2 pl-3 pr-10",
                "rounded-lg",
                "bg-bg text-main",
                "border border-main/15",
                "text-xs tracking-wider",
                "font-mono",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-caret",
              ])}
            />
            <div className={cn(["absolute right-1.5", "flex items-center gap-1"])}>
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    onClick={() => toggleRevealed()}
                    className={cn([
                      "p-1",
                      "rounded",
                      "bg-transparent border-0",
                      "text-ink hover:text-main",
                      "transition-colors cursor-pointer",
                    ])}
                  >
                    {state.revealed ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className={cn([
                        "px-2 py-1",
                        "rounded-md",
                        "bg-main text-bg",
                        "text-[10px] font-semibold",
                        "font-mono",
                        "z-50",
                      ])}
                    >
                      {state.revealed ? "Ẩn khóa API" : "Hiện khóa API"}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
          </div>
        </div>

        {state.status.kind !== "idle" && (
          <div
            className={cn([
              "flex items-center justify-between",
              "text-[11px] font-semibold",
              "font-mono",
            ])}
          >
            <div
              className={cn([
                "inline-flex items-center gap-1.5",
                state.status.kind === "ok" ? "text-caret-deep" : "text-error",
              ])}
            >
              <span
                className={cn([
                  "w-2 h-2",
                  "rounded-full",
                  state.status.kind === "ok" ? "bg-caret animate-pulse" : "bg-error",
                ])}
              />
              {state.status.msg}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(["flex items-center justify-end gap-2", "font-mono text-xs"])}
      >
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={state.busy || !dirty}
          className={cn([
            "px-3.5 py-1.5",
            "rounded-lg",
            "bg-caret hover:bg-caret/90 text-main",
            "border-0",
            "font-bold tracking-wide text-xs",
            "inline-flex items-center gap-1",
            "transition-colors cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ])}
        >
          <Check className="w-3.5 h-3.5" />
          Lưu cấu hình
        </button>
      </div>
    </div>
  );
}
