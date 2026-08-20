import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "destructive" | "danger" | "dark";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_16px_40px_rgba(182,255,95,0.22)] hover:bg-[var(--accent-strong)]",
  secondary: "border border-black/10 bg-white/70 text-[var(--ink)] hover:bg-white",
  ghost: "text-current hover:bg-black/5",
  outline: "border border-current/20 bg-transparent text-current hover:bg-current/[0.06]",
  destructive: "bg-[var(--danger)] text-white hover:brightness-105",
  danger: "bg-[var(--danger)] text-white hover:brightness-105",
  dark: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-13 px-5 text-base",
  icon: "h-12 w-12 p-0",
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
