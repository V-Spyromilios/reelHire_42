import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type EmployerActionLinkProps = ComponentProps<typeof Link>;

export function EmployerPrimaryActionLink({ className, ...props }: EmployerActionLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--primary)] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] shadow-[0_10px_28px_rgba(23,23,22,0.14)] transition hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)] hover:text-[var(--primary-foreground)] active:scale-[0.99] active:bg-[var(--primary)] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-focus)]",
        className,
      )}
      {...props}
    />
  );
}
