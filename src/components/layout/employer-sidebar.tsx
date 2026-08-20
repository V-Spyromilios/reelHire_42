"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, LayoutDashboard, Plus, Sparkles, UsersRound } from "lucide-react";
import { EmployerPrimaryActionLink } from "@/components/ui/employer-action-link";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/employer/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/employer/opportunities", label: "Opportunities", icon: BriefcaseBusiness },
  { href: "/employer/opportunities", label: "Talent", icon: UsersRound },
  { href: "/employer/matches", label: "Matches", icon: Sparkles },
  { href: "/employer/dashboard", label: "Analytics", icon: BarChart3 },
];

export function EmployerSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[var(--employer-line)] bg-[var(--employer-surface)]/88 p-5 backdrop-blur-xl lg:block">
      <Link
        href="/"
        className="flex items-center gap-3 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6f9f2f]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#171716] text-sm font-black text-[var(--accent)]">
          RH
        </span>
        <span>
          <span className="block text-sm font-bold">ReelHire</span>
          <span className="block text-xs text-[var(--muted)]">Employer Studio</span>
        </span>
      </Link>
      <EmployerPrimaryActionLink
        href="/employer/opportunities/new"
        className="mt-8 w-full"
      >
        <Plus className="h-4 w-4 text-[var(--accent)]" />
        Create Opportunity
      </EmployerPrimaryActionLink>
      <nav aria-label="Employer navigation" className="mt-8 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium text-[var(--muted)] transition hover:border-[#e4dccd] hover:bg-[#f0ece2] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6f9f2f]",
                active &&
                  "border-[#ddd4c2] bg-[#eee9dc] text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] hover:border-[#d7cdb9] hover:bg-[#e9e2d3] hover:text-[var(--ink)]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-4 w-4", active ? "text-[#5f8f23]" : "text-current")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
