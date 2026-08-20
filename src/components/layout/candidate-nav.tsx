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
      <div className="grid w-full grid-cols-4 rounded-[22px] border border-white/10 bg-[#080909]/62 p-1 text-white shadow-[0_16px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[10px] font-semibold text-white/54 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                active && "bg-white/[0.08] text-[#f2f0ea]",
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
