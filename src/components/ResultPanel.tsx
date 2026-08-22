import { Button } from "@kobalte/core/button";
import { RotateCcw, ChevronRight } from "lucide-solid";
import { Show } from "solid-js";
import { Navigate, useNavigate } from "@solidjs/router";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants";
import { useTranslation } from "@/stores/translation";
import Badge from "./Badge";
import CopyButton from "./CopyButton";

function FieldCard(props: {
  label: string;
  sub?: string;
  text: string;
  textClass: string;
  cardClass?: string;
}) {
  return (
    <div
      class={cn([
        "relative",
        "px-3 py-2.5",
        "bg-panel border border-main/8",
        "rounded-[10px]",
        "transition-colors duration-150",
        "hover:border-main/16",
        props.cardClass,
      ])}
    >
      <div class={cn(["flex items-center justify-between", "mb-[5px]"])}>
        <span
          class={cn([
            "flex items-center gap-1.5",
            "text-[8.5px] font-bold tracking-[.16em] uppercase",
            "text-ink",
          ])}
        >
          {props.label}
          <Show when={props.sub}>
            <span class={cn(["font-medium tracking-normal", "text-sub"])}>
              · {props.sub}
            </span>
          </Show>
        </span>
        <div class={cn(["flex items-center gap-1"])}>
          <CopyButton text={props.text} class="opacity-100" />
        </div>
      </div>
      <p class={cn(["m-0", props.textClass])}>{props.text}</p>
    </div>
  );
}

export default function ResultPanel() {
  const navigate = useNavigate();
  const t = useTranslation();
  const result = () => t.translation.result;
  const originPath = () =>
    t.translation.origin === "paste" ? ROUTES.paste : ROUTES.upload;

  return (
    <Show when={result()} fallback={<Navigate href={originPath()} />}>
      {(r) => (
        <>
          <div class={cn(["flex items-center justify-between", "mb-3"])}>
            <div class={cn(["flex items-center gap-1.5"])}>
              <Badge variant="success" dot>
                Detected · ZH
              </Badge>
              <Badge>
                ZH
                <ChevronRight class="w-2 h-2" />
                VI
              </Badge>
            </div>
          </div>

          <div class={cn(["flex flex-col gap-2.5"])}>
            <FieldCard
              label="Original"
              sub="中文"
              text={r().detectedText}
              textClass="text-[15px] font-medium leading-[1.65] tracking-[.02em] text-main"
            />

            <Show when={r().pinyin}>
              <FieldCard
                label="Pinyin"
                sub="Bính âm"
                text={r().pinyin ?? ""}
                textClass="text-[13.5px] font-medium leading-[1.65] tracking-[.04em] text-caret-deep"
                cardClass="bg-paper"
              />
            </Show>

            <FieldCard
              label="Translation"
              sub="Tiếng Việt"
              text={r().translatedText}
              textClass="text-[13.5px] font-semibold leading-[1.7] text-main"
            />
          </div>

          <div
            class={cn(["flex items-center justify-between", "mt-[13px] pt-1"])}
          >
            <span
              class={cn([
                "text-[9px] tracking-[.04em]",
                "text-ink",
                "font-mono",
              ])}
            >
              <kbd
                class={cn([
                  "px-[5px] py-[2px]",
                  "rounded-[4px]",
                  "bg-sub-alt font-semibold",
                ])}
              >
                Esc
              </kbd>{" "}
              đóng
            </span>
            <div class={cn(["flex gap-2"])}>
              <Button
                onClick={() => navigate(originPath())}
                class={cn([
                  "h-[30px] px-[13px]",
                  "rounded-[8px]",
                  "border-0",
                  "bg-caret text-main",
                  "text-[9.5px] font-bold tracking-[.08em] uppercase",
                  "inline-flex items-center gap-1.5",
                  "cursor-pointer",
                  "transition-colors duration-150",
                  "hover:brightness-[.97]",
                ])}
              >
                <RotateCcw class="w-3 h-3" />
                Dịch lại
              </Button>
            </div>
          </div>
        </>
      )}
    </Show>
  );
}
