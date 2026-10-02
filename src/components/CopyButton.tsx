import { useEffect, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { COPY_RESET_DELAY_MS } from "@/constants";

export default function CopyButton(props: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await writeText(props.text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          onClick={handleCopy}
          aria-label="Copy to clipboard"
          className={cn([
            "w-6 h-6",
            "border-0 rounded-[6px]",
            "bg-main/8 text-ink",
            "grid place-items-center",
            "cursor-pointer",
            "opacity-0",
            "transition-opacity duration-150",
            "group-hover:opacity-100",
            "hover:bg-main/16",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-caret",
            props.className,
          ])}
        >
          {copied ? (
            <Check className="w-[13px] h-[13px]" />
          ) : (
            <Copy className="w-[13px] h-[13px]" />
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
            {copied ? "Đã sao chép" : "Copy to clipboard"}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
