"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CircleUserRound, Compass, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/candidate/feed", label: "Discover", icon: Compass },
  { href: "/candidate/challenges", label: "Challenges", icon: BriefcaseBusiness },
  { href: "/candidate/matches", label: "Matches", icon: Sparkles },
  { href: "/candidate/profile", label: "Profile", icon: CircleUserRound },
];

export function CandidateNav() {
  const pathname = usePathname();
  return (
    <nav
      data-testid="candidate-bottom-nav"
      aria-label="Candidate navigation"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[430px] justify-center px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div className="grid w-full grid-cols-4 rounded-[22px] border border-[var(--candidate-line)] bg-[var(--candidate-surface)]/90 p-1 text-[var(--candidate-text)] shadow-[0_16px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[10px] font-semibold text-[var(--candidate-muted)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                active && "bg-[rgba(var(--candidate-info-rgb),0.24)] text-[var(--candidate-text)]",
              )}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
