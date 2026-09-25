import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Badge(props: BadgeProps) {
  const variant = props.variant ?? "neutral";

  return (
    <span
      className={cn(
        [
          "inline-flex items-center gap-[5px]", // Flexbox + Spacing
          "text-[9px] font-semibold tracking-[.12em] uppercase", // Typography
          "px-[9px] py-[5px]", // Spacing
          "rounded-[6px]", // Borders
          props.className,
        ],
        {
          "text-caret-deep bg-caret/22": variant === "success",
          "text-chip bg-sub-alt": variant === "neutral",
        },
      )}
    >
      {props.dot && (
        <span className={cn(["w-[5px] h-[5px]", "rounded-full", "bg-caret"])} />
      )}
      {props.children}
    </span>
  );
}
