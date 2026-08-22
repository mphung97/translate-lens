import { Button } from "@kobalte/core/button";
import { Tooltip } from "@kobalte/core/tooltip";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Check, Copy } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { cn } from "@/lib/utils";
import { COPY_RESET_DELAY_MS } from "@/constants";

export default function CopyButton(props: { text: string; class?: string }) {
  const [copied, setCopied] = createSignal(false);

  async function handleCopy() {
    try {
      await writeText(props.text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <Tooltip>
      <Tooltip.Trigger
        as={Button}
        onClick={handleCopy}
        aria-label="Copy to clipboard"
        class={cn([
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
          props.class,
        ])}
      >
        <Show when={copied()} fallback={<Copy class="w-[13px] h-[13px]" />}>
          <Check class="w-[13px] h-[13px]" />
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
          {copied() ? "Đã sao chép" : "Copy to clipboard"}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
}
