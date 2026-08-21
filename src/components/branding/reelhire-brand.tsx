import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type ReelHireBrandVariant = "hero" | "sidebar" | "compact";

type ReelHireBrandProps = {
  className?: string;
  priority?: boolean;
  subtitle?: string;
  variant?: ReelHireBrandVariant;
};

const logoClassByVariant: Record<ReelHireBrandVariant, string> = {
  hero: "w-[156px] sm:w-[196px] lg:w-[218px]",
  sidebar: "w-[132px]",
  compact: "w-[118px]",
};

export function ReelHireBrand({ className, priority = false, subtitle, variant = "compact" }: ReelHireBrandProps) {
  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <Image
        src="/branding/reelhire-logo.png"
        alt="ReelHire"
        width={1800}
        height={487}
        priority={priority}
        className={cn("h-auto object-contain", logoClassByVariant[variant])}
      />
      {subtitle ? (
        <span className="mt-1 text-xs font-medium leading-none text-[var(--muted)]">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
