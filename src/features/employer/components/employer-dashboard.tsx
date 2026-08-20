"use client";

import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Clock, Eye, Sparkles, Trophy, UsersRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { EmployerPrimaryActionLink } from "@/components/ui/employer-action-link";
import { LoadingState } from "@/components/ui/state";
import { useEmployerOpportunities, useOpportunityAnalytics } from "@/features/employer/hooks";
import { useMatches } from "@/features/matches/hooks";
import type { OpportunityAnalytics } from "@/domain/types";

const statIcons = [Eye, Trophy, Clock, UsersRound, Sparkles];

const emptyAnalytics: OpportunityAnalytics = {
  opportunityId: "",
  impressions: 0,
  uniqueViews: 0,
  acceptedCount: 0,
  passedCount: 0,
  savedCount: 0,
  submissionsCount: 0,
  acceptanceRate: 0,
  averageDecisionTimeMs: 0,
  medianDecisionTimeMs: 0,
  averageWatchTimeMs: 0,
  completionRate: 0,
  insight: "Publish an opportunity to start collecting candidate engagement.",
  decisionTimeDistribution: [],
};

function formatMs(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function CountValue({ value, suffix = "" }: { value: string | number; suffix?: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.span initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      {value}
      {suffix}
    </motion.span>
  );
}

export function EmployerDashboard() {
  const { data: opportunities, isLoading, isError } = useEmployerOpportunities();
  const primaryOpportunity = opportunities?.[0];
  const { data: analytics } = useOpportunityAnalytics(primaryOpportunity?.id);
  const { data: matches } = useMatches();

  if (isLoading) return <LoadingState label="Loading employer workspace..." />;

  const activeOpportunities = opportunities ?? [];
  const dashboardAnalytics = analytics ?? emptyAnalytics;
  const stats = [
    { label: "Total views", value: dashboardAnalytics.uniqueViews.toLocaleString() },
    { label: "Acceptance rate", value: Math.round(dashboardAnalytics.acceptanceRate * 100), suffix: "%" },
    { label: "Avg decision", value: formatMs(dashboardAnalytics.averageDecisionTimeMs) },
    { label: "Submissions", value: dashboardAnalytics.submissionsCount },
    { label: "Matches", value: matches?.length ?? 0 },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--employer-line)] pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">Nova Systems</p>
          <h1 className="mt-2 text-4xl font-black tracking-normal">Hiring workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Watch the role pitch performance, challenge conversion, and technical submissions without reducing people to
            generic scores.
          </p>
        </div>
        <EmployerPrimaryActionLink
          href="/employer/opportunities/new"
          className="shrink-0"
        >
          Create Opportunity
          <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
        </EmployerPrimaryActionLink>
      </header>
      <section className="grid gap-4 py-8 md:grid-cols-5">
        {stats.map((stat, index) => {
          const Icon = statIcons[index];
          return (
            <article key={stat.label} className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-4">
              <Icon className="h-5 w-5 text-[var(--muted)]" />
              <p className="mt-5 text-3xl font-black">
                <CountValue value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{stat.label}</p>
            </article>
          );
        })}
      </section>
      {isError ? (
        <p className="mb-6 rounded-2xl border border-[#efc7b8] bg-[#fff4ed] px-4 py-3 text-sm font-semibold text-[#8c321f]">
          Could not load the latest employer opportunities. Try refreshing the workspace.
        </p>
      ) : null}
      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
          {primaryOpportunity ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--muted)]">Pitch Performance</p>
                  <h2 className="mt-1 text-2xl font-black">{primaryOpportunity.roleTitle}</h2>
                </div>
                <Badge>{Math.round(dashboardAnalytics.completionRate * 100)}% completion</Badge>
              </div>
              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardAnalytics.decisionTimeDistribution}>
                    <defs>
                      <linearGradient id="acceptedGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#8fe73d" stopOpacity={0.72} />
                        <stop offset="95%" stopColor="#8fe73d" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={34} />
                    <Tooltip />
                    <Area type="monotone" dataKey="accepted" stroke="#5f9e26" fill="url(#acceptedGradient)" strokeWidth={3} />
                    <Area type="monotone" dataKey="saved" stroke="#171716" fill="#17171614" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 rounded-2xl bg-[var(--employer-surface-2)] p-4 text-sm leading-6 text-[var(--muted)]">
                {dashboardAnalytics.insight}
              </p>
            </>
          ) : (
            <div className="flex min-h-[26rem] flex-col justify-center rounded-2xl border border-dashed border-[var(--employer-line)] bg-[var(--employer-surface-2)] p-8 text-center">
              <p className="text-sm font-semibold text-[var(--muted)]">Pitch Performance</p>
              <h2 className="mt-2 text-2xl font-black">No pitch data yet</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
                Publish an opportunity to start measuring candidate engagement.
              </p>
              <EmployerPrimaryActionLink href="/employer/opportunities/new" className="mx-auto mt-6">
                Create Opportunity
                <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
              </EmployerPrimaryActionLink>
            </div>
          )}
        </article>
        <aside className="space-y-4">
          <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Active opportunities</h2>
          {activeOpportunities.map((opportunity) => (
            <Link
              key={opportunity.id}
              href={`/employer/opportunities/${opportunity.id}`}
              className="block rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black">{opportunity.roleTitle}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{opportunity.challengeTitle}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--muted)]" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {opportunity.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
            </Link>
          ))}
          {!activeOpportunities.length ? (
            <div className="rounded-2xl border border-dashed border-[var(--employer-line)] bg-[var(--employer-surface)] p-5 text-center">
              <h3 className="font-black">No active opportunities yet.</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Create an opportunity to start receiving candidate responses.
              </p>
              <EmployerPrimaryActionLink href="/employer/opportunities/new" className="mt-5">
                Create Opportunity
                <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
              </EmployerPrimaryActionLink>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
