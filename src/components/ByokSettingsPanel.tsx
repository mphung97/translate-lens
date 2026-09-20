import { Button } from "@kobalte/core/button";
import { Select } from "@kobalte/core/select";
import { Separator } from "@kobalte/core/separator";
import { Switch } from "@kobalte/core/switch";
import { TextField } from "@kobalte/core/text-field";
import { ToggleGroup } from "@kobalte/core/toggle-group";
import { Tooltip } from "@kobalte/core/tooltip";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-solid";
import { onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
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
  const [state, setState] = createStore<ByokState>({
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

  const dirty = () => state.apiKey !== state.savedKey;

  function loadProvider(p: ByokProviderId) {
    const k = prefs.apiKeys()[p];
    setState({ apiKey: k ?? "", savedKey: k ?? "", status: IDLE });
  }

  function refreshPresence() {
    const all = prefs.apiKeys();
    setState({
      hasStored: {
        groq: !!all.groq,
        openrouter: !!all.openrouter,
      },
    });
  }

  function selectProvider(p: ByokProviderId) {
    if (p === state.provider) return;
    setState({ provider: p, revealed: false });
    prefs.setByokProvider(p);
    loadProvider(p);
  }

  function editKey(v: string) {
    setState({ apiKey: v, status: IDLE });
  }

  function toggleRevealed() {
    setState("revealed", (v) => !v);
  }

  async function handleSave() {
    const p = state.provider;
    setState({ busy: true });
    try {
      const trimmed = state.apiKey.trim();
      if (trimmed) {
        await setKey(p, trimmed);
        prefs.setApiKeysInMemory({ ...prefs.apiKeys(), [p]: trimmed });
        setState({
          savedKey: trimmed,
          status: { kind: "ok", msg: "Đã lưu vào Keychain" },
        });
        setState("hasStored", p, true);
      } else {
        await clearKey(p);
        prefs.setApiKeysInMemory({ ...prefs.apiKeys(), [p]: null });
        setState({
          savedKey: "",
          status: { kind: "ok", msg: "Đã xóa key khỏi Keychain" },
        });
        setState("hasStored", p, false);
      }
    } catch (e) {
      setState({ status: { kind: "err", msg: String(e) } });
    } finally {
      setState({ busy: false });
    }
  }

  function handleTest() {
    const k = prefs.apiKeys()[state.provider];
    if (k && k === state.apiKey.trim()) {
      setState({ status: { kind: "ok", msg: "Hợp lệ · khớp với key đã lưu" } });
    } else if (k) {
      setState({ status: { kind: "err", msg: "Key hiển thị khác key đã lưu — hãy Lưu lại" } });
    } else {
      setState({ status: { kind: "err", msg: "Chưa có key trong Keychain — hãy Lưu trước" } });
    }
  }

  async function handleReset() {
    prefs.reset();
    const p = state.provider;
    await clearKey(p);
    prefs.setApiKeysInMemory({ ...prefs.apiKeys(), [p]: null });
    setState({ apiKey: "", savedKey: "", status: IDLE });
    setState("hasStored", p, false);
  }

  async function handleAlwaysOnTop(v: boolean) {
    setState({ alwaysOnTop: v });
    try {
      await setAlwaysOnTop(v);
    } catch (e) {
      setState({ alwaysOnTop: !v, status: { kind: "err", msg: String(e) } });
    }
  }

  async function loadVersion() {
    try {
      setState({ version: await getAppVersion() });
    } catch {
      setState({ version: "0.1.0" });
    }
  }

  async function handleCheck() {
    if (state.updateBusy) return;
    setState({ updateBusy: true, updateMsg: "" });
    try {
      const r = await checkForUpdate();
      if (r.available) {
        setState({
          updateAvailable: true,
          latestVersion: r.version ?? "",
          updateMsg: `Có bản mới v${r.version ?? ""}`,
        });
      } else {
        setState({ updateAvailable: false, updateMsg: "Đã là bản mới nhất" });
      }
    } catch (e) {
      setState({ updateMsg: String(e) });
    } finally {
      setState({ updateBusy: false });
    }
  }

  async function handleInstall() {
    if (state.updateBusy) return;
    setState({ updateBusy: true, updateMsg: "" });
    try {
      const ok = await installAndRelaunch();
      if (!ok) setState({ updateAvailable: false, updateMsg: "Đã là bản mới nhất" });
    } catch (e) {
      setState({ updateMsg: String(e) });
    } finally {
      setState({ updateBusy: false });
    }
  }

  onMount(() => {
    refreshPresence();
    loadProvider(state.provider);
    void loadVersion();
    void isAlwaysOnTop()
      .then((v) => setState({ alwaysOnTop: v }))
      .catch(() => {});
  });

  const active = () => PROVIDERS.find((p) => p.id === state.provider)!;
  const selectedLang = () =>
    LANGUAGES.find((l) => l.value === prefs.preferences().targetLanguage) ??
    LANGUAGES[0];

  return (
    <div class={cn(["flex flex-col gap-3.5", "font-sans"])}>
      {/* Status header */}
      <div class={cn(["flex items-center justify-between"])}>
        <div class={cn(["flex items-center gap-2"])}>
          <Badge variant="success" dot>
            SETTINGS · BYOK
          </Badge>
          <Badge>CONFIG MODE</Badge>
          {/*<Show
            when={state.hasStored[state.provider]}
            fallback={
              <span
                class={cn([
                  "inline-flex items-center gap-1",
                  "text-[10px] font-semibold",
                  "text-sub",
                  "font-mono",
                ])}
              >
                Chưa cấu hình
              </span>
            }
          >
            <span
              class={cn([
                "inline-flex items-center gap-1",
                "text-[10px] font-semibold",
                "text-caret-deep",
                "font-mono",
              ])}
            >
              <Check class="w-3 h-3" />
              Keychain đã lưu
            </span>
          </Show>*/}
        </div>
      </div>

      {/* Card 1: Core prefs */}
      <div
        class={cn([
          "p-3.5",
          "rounded-xl",
          "bg-panel border border-main/8",
          "flex flex-col gap-3",
        ])}
      >
        <div class={cn(["flex items-center justify-between gap-2"])}>
          <div>
            <span
              class={cn([
                "block",
                "text-xs font-bold tracking-tight",
                "text-main",
                "font-mono",
              ])}
            >
              Ngôn ngữ đích (Target Language)
            </span>
            <p class={cn(["text-[11px]", "text-ink"])}>
              Ngôn ngữ mặc định khi tra nhanh
            </p>
          </div>
          <Select
            options={LANGUAGES}
            optionValue="value"
            optionTextValue="label"
            value={selectedLang()}
            onChange={(v) => v && prefs.setTargetLanguage(v.value)}
            sameWidth={false}
            gutter={4}
            itemComponent={(props) => (
              <Select.Item
                item={props.item}
                class={cn([
                  "flex items-center justify-between",
                  "px-2.5 py-1.5",
                  "rounded-md",
                  "text-xs font-semibold",
                  "font-mono",
                  "text-main",
                  "cursor-pointer outline-none select-none",
                  "data-[highlighted]:bg-caret/25",
                  "data-[selected]:bg-caret/30",
                ])}
              >
                <Select.ItemLabel>{props.item.rawValue.label}</Select.ItemLabel>
                <Select.ItemIndicator>
                  <Check class="w-3.5 h-3.5 text-caret-deep" />
                </Select.ItemIndicator>
              </Select.Item>
            )}
          >
            <Select.Trigger
              class={cn([
                "inline-flex items-center justify-between gap-2",
                "min-w-[150px]",
                "py-1.5 pl-2.5 pr-2",
                "rounded-lg",
                "border border-main/12",
                "bg-bg text-main",
                "text-xs font-semibold",
                "font-mono",
                "cursor-pointer",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-caret",
              ])}
              aria-label="Target language"
              disabled
            >
              <Select.Value<(typeof LANGUAGES)[number]>
                class={cn(["truncate"])}
              >
                {(state) => state.selectedOption().label}
              </Select.Value>
              <Select.Icon>
                <ChevronDown class="w-3.5 h-3.5 text-sub" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                class={cn([
                  "min-w-[180px]",
                  "p-1.5",
                  "rounded-lg",
                  "bg-bg border border-main/12",
                  "shadow-lg",
                  "z-50",
                ])}
              >
                <Select.Listbox
                  class={cn(["max-h-[220px] overflow-auto", "outline-none"])}
                />
              </Select.Content>
            </Select.Portal>
          </Select>
        </div>

        <Separator class={cn(["h-px", "bg-main/6", "border-0"])} />

        <Switch
          checked={state.alwaysOnTop}
          onChange={(v) => handleAlwaysOnTop(v)}
          class={cn(["flex items-center justify-between gap-2"])}
        >
          <div>
            <Switch.Label
              class={cn([
                "block",
                "text-xs font-bold tracking-tight",
                "text-main",
                "font-mono",
                "select-none",
              ])}
            >
              Luôn nổi trên màn hình (Always on top)
            </Switch.Label>
            <p class={cn(["text-[11px]", "text-ink"])}>
              Ghim cửa sổ popup trên tất cả ứng dụng
            </p>
          </div>
          <Switch.Input class={cn(["sr-only"])} />
          <Switch.Control
            class={cn([
              "relative shrink-0",
              "w-10 h-5",
              "rounded-full",
              "cursor-pointer",
              "transition-colors",
              "bg-sub-alt",
              "data-[checked]:bg-caret",
            ])}
          >
            <Switch.Thumb
              class={cn([
                "absolute top-[2px] left-[2px]",
                "block w-4 h-4",
                "rounded-full",
                "bg-paper border border-main/15",
                "transition-transform",
                "data-[checked]:translate-x-5",
              ])}
            />
          </Switch.Control>
        </Switch>

        <Separator class={cn(["h-px", "bg-main/6", "border-0"])} />

        <div class={cn(["flex items-center justify-between gap-2"])}>
          <div>
            <span
              class={cn([
                "block",
                "text-xs font-bold tracking-tight",
                "text-main",
                "font-mono",
                "select-none",
              ])}
            >
              Phiên bản (App version){" "}
              <Show when={state.version}>
                <span class={cn(["text-sub"])}>v{state.version}</span>
              </Show>
            </span>
            <p class={cn(["text-[11px]", "text-ink"])}>
              <Show when={state.updateMsg} fallback={"Kiểm tra và cài bản mới"}>
                {state.updateMsg}
              </Show>
            </p>
          </div>
          <Button
            onClick={() =>
              state.updateAvailable ? void handleInstall() : void handleCheck()
            }
            disabled={state.updateBusy}
            class={cn([
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
            <Show
              when={!state.updateBusy}
              fallback={"Đang cài..."}
            >
              <Show
                when={state.updateAvailable}
                fallback={"Kiểm tra cập nhật"}
              >
                Cài đặt v{state.latestVersion}
              </Show>
            </Show>
          </Button>
        </div>
      </div>

      {/* Card 2: BYOK */}
      <div
        class={cn([
          "p-3.5",
          "rounded-xl",
          "bg-panel border border-main/8",
          "flex flex-col gap-3",
        ])}
      >
        <div
          class={cn([
            "flex items-center justify-between",
            "pb-2",
            "border-b border-main/6",
          ])}
        >
          <div class={cn(["flex items-center gap-1.5"])}>
            <span class={cn(["w-1.5 h-1.5", "rounded-full", "bg-caret"])} />
            <span
              class={cn([
                "text-xs font-bold tracking-tight uppercase",
                "text-main",
                "font-mono",
              ])}
            >
              Cấu hình AI API Key (BYOK)
            </span>
          </div>
          <span
            class={cn([
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
            class={cn([
              "block mb-1.5",
              "text-[11px] font-semibold",
              "text-ink",
              "font-mono",
            ])}
          >
            Nhà cung cấp AI:
          </span>
          <ToggleGroup
            value={state.provider}
            onChange={(v) => {
              if (typeof v === "string" && v) selectProvider(v as ByokProviderId);
            }}
            class={cn(["grid grid-cols-4 gap-1.5", "font-mono text-xs"])}
          >
            {PROVIDERS.map((p) => (
              <ToggleGroup.Item
                value={p.id}
                aria-label={p.label}
                class={cn([
                  "relative",
                  "py-1 px-2",
                  "rounded-lg",
                  "border",
                  "text-center",
                  "transition-colors cursor-pointer outline-none",
                  "bg-sub-alt text-main font-medium border-main/6 hover:bg-sub-alt/80",
                  "focus-visible:ring-1 focus-visible:ring-caret",
                  "data-[pressed]:bg-main data-[pressed]:text-bg data-[pressed]:font-bold data-[pressed]:border-main",
                ])}
              >
                {p.label}
                <Show when={state.hasStored[p.id]}>
                  <span
                    class={cn([
                      "absolute top-1 right-1",
                      "w-1.5 h-1.5",
                      "rounded-full",
                      "bg-caret",
                    ])}
                  />
                </Show>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup>
        </div>

        <div
          class={cn([
            "flex items-center justify-between",
            "px-2.5 py-1.5",
            "rounded-lg",
            "bg-bg border border-main/6",
            "text-[11px]",
            "font-mono",
          ])}
        >
          <span class={cn(["flex flex-col gap-0.5", "text-ink"])}>
            <span>
              Text: <strong class={cn(["text-main"])}>{active().models.text}</strong>
            </span>
            <span>
              Ảnh: <strong class={cn(["text-main"])}>{active().models.image}</strong>
            </span>
          </span>
          <span class={cn(["text-[10px] font-semibold", "text-caret-deep"])}>
            {active().note}
          </span>
        </div>

        <TextField
          value={state.apiKey}
          onChange={(v) => editKey(v)}
        >
          <TextField.Label
            class={cn([
              "block mb-1",
              "text-[11px] font-medium",
              "text-ink",
              "font-mono",
            ])}
          >
            Khóa API {active().label}:
          </TextField.Label>
          <div class={cn(["relative", "flex items-center"])}>
            <TextField.Input
              type={state.revealed ? "text" : "password"}
              placeholder={`sk-... (${active().label})`}
              class={cn([
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
            <div class={cn(["absolute right-1.5", "flex items-center gap-1"])}>
              <Tooltip>
                <Tooltip.Trigger
                  as={Button}
                  onClick={() => toggleRevealed()}
                  class={cn([
                    "p-1",
                    "rounded",
                    "bg-transparent border-0",
                    "text-ink hover:text-main",
                    "transition-colors cursor-pointer",
                  ])}
                >
                  <Show
                    when={state.revealed}
                    fallback={<Eye class="w-3.5 h-3.5" />}
                  >
                    <EyeOff class="w-3.5 h-3.5" />
                  </Show>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    class={cn([
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
              </Tooltip>
              {/*<Button
                onClick={() => handleTest()}
                disabled={state.busy}
                class={cn([
                  "px-2 py-1",
                  "rounded",
                  "bg-sub-alt hover:bg-sub-alt/80 text-main",
                  "border border-main/10",
                  "text-[10px] font-bold",
                  "font-mono",
                  "transition-colors cursor-pointer",
                  "disabled:opacity-50 disabled:cursor-wait",
                ])}
              >
                Test Key
              </Button>*/}
            </div>
          </div>
        </TextField>

        <Show when={state.status.kind !== "idle"}>
          <div
            class={cn([
              "flex items-center justify-between",
              "text-[11px] font-semibold",
              "font-mono",
            ])}
          >
            <div
              class={cn([
                "inline-flex items-center gap-1.5",
                state.status.kind === "ok" ? "text-caret-deep" : "text-error",
              ])}
            >
              <span
                class={cn([
                  "w-2 h-2",
                  "rounded-full",
                  state.status.kind === "ok" ? "bg-caret animate-pulse" : "bg-error",
                ])}
              />
              {state.status.msg}
            </div>
          </div>
        </Show>
      </div>

      {/* Footer */}
      <div
        class={cn(["flex items-center justify-end gap-2", "font-mono text-xs"])}
      >
        {/*<Button
          onClick={handleReset}
          disabled={state.busy}
          class={cn([
            "px-2.5 py-1",
            "rounded-lg",
            "bg-transparent border-0",
            "text-ink hover:text-main hover:bg-black/5",
            "text-[11px] font-bold tracking-wide",
            "transition-colors cursor-pointer",
            "disabled:opacity-50",
          ])}
        >
          Khôi phục mặc định
        </Button>*/}
        <Button
          onClick={() => handleSave()}
          disabled={state.busy || !dirty()}
          class={cn([
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
          <Check class="w-3.5 h-3.5" />
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
}
