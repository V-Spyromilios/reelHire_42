import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-current/15 bg-current/[0.06] px-2.5 py-1 text-xs font-semibold",
        className,
      )}
      {...props}
    />
  );
}
