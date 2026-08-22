import { Badge as KBadge } from "@kobalte/core/badge";
import type { JSX } from "solid-js";
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  class?: string;
  children: JSX.Element;
}

export default function Badge(props: BadgeProps) {
  const variant = () => props.variant ?? "neutral";

  return (
    <KBadge
      class={cn(
        [
          "inline-flex items-center gap-[5px]", // Flexbox + Spacing
          "text-[9px] font-semibold tracking-[.12em] uppercase", // Typography
          "px-[9px] py-[5px]", // Spacing
          "rounded-[6px]", // Borders
          props.class,
        ],
        {
          "text-caret-deep bg-caret/22": variant() === "success",
          "text-chip bg-sub-alt": variant() === "neutral",
        },
      )}
    >
      {props.dot && (
        <span class={cn(["w-[5px] h-[5px]", "rounded-full", "bg-caret"])} />
      )}
      {props.children}
    </KBadge>
  );
}
