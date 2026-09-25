import { RotateCcw, ChevronRight } from "lucide-react";
import { Navigate, useNavigate } from "@tanstack/react-router";
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
      className={cn([
        "relative",
        "px-3 py-2.5",
        "bg-panel border border-main/8",
        "rounded-[10px]",
        "transition-colors duration-150",
        "hover:border-main/16",
        props.cardClass,
      ])}
    >
      <div className={cn(["flex items-center justify-between", "mb-[5px]"])}>
        <span
          className={cn([
            "flex items-center gap-1.5",
            "text-[8.5px] font-bold tracking-[.16em] uppercase",
            "text-ink",
          ])}
        >
          {props.label}
          {props.sub && (
            <span className={cn(["font-medium tracking-normal", "text-sub"])}>
              · {props.sub}
            </span>
          )}
        </span>
        <div className={cn(["flex items-center gap-1"])}>
          <CopyButton text={props.text} className="opacity-100" />
        </div>
      </div>
      <p className={cn(["m-0", props.textClass])}>{props.text}</p>
    </div>
  );
}

export default function ResultPanel() {
  const navigate = useNavigate();
  const { translation } = useTranslation();
  const result = translation.result;
  const originPath =
    translation.origin === "paste" ? ROUTES.paste : ROUTES.upload;

  if (!result) return <Navigate to={originPath} />;

  return (
    <>
      <div className={cn(["flex items-center justify-between", "mb-3"])}>
        <div className={cn(["flex items-center gap-1.5"])}>
          {translation.ocrScore !== null && (
            <Badge dot variant="success">
              {`Local OCR · ${Math.round((translation.ocrScore ?? 0) * 100)}%`}
            </Badge>
          )}
          <Badge>
            ZH
            <ChevronRight className="w-2 h-2" />
            VI
          </Badge>
        </div>
      </div>

      <div className={cn(["flex flex-col gap-2.5"])}>
        <FieldCard
          label="Original"
          sub="中文"
          text={result.detectedText}
          textClass="text-[15px] font-medium leading-[1.65] tracking-[.02em] text-main"
        />
        <FieldCard
          label="Translation"
          sub="Tiếng Việt"
          text={result.translatedText}
          textClass="text-[13.5px] font-semibold leading-[1.7] text-main"
        />
        {result.pinyin && (
          <FieldCard
            label="Pinyin"
            sub="Bính âm"
            text={result.pinyin ?? ""}
            textClass="text-[13.5px] font-medium leading-[1.65] tracking-[.04em] text-caret-deep"
            cardClass="bg-paper"
          />
        )}
      </div>

      <div className={cn(["flex items-center justify-between", "mt-[13px] pt-1"])}>
        <span className={cn(["text-[9px] tracking-[.04em]", "text-ink", "font-mono"])}>
          <kbd
            className={cn([
              "px-[5px] py-[2px]",
              "rounded-[4px]",
              "bg-sub-alt font-semibold",
            ])}
          >
            Esc
          </kbd>{" "}
          đóng
        </span>
        <div className={cn(["flex gap-2"])}>
          <button
            type="button"
            onClick={() => navigate({ to: originPath })}
            className={cn([
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
            <RotateCcw className="w-3 h-3" />
            Dịch lại
          </button>
        </div>
      </div>
    </>
  );
}
