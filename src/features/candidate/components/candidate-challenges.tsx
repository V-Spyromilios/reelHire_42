"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/state";
import { useCandidateChallenges } from "@/features/candidate/hooks";

export function CandidateChallenges() {
  const { data, isLoading } = useCandidateChallenges();

  if (isLoading) return <LoadingState label="Loading challenges..." />;

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-5 pb-28 pt-8">
      <h1 className="text-3xl font-black">Challenges</h1>
      <p className="mt-2 text-sm leading-6 text-white/58">Accepted projects waiting for your best work.</p>
      <div className="mt-7 space-y-4">
        {(data ?? []).map((challenge) => (
          <article key={challenge.id} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">{challenge.employer.companyName}</p>
                <h2 className="mt-1 text-xl font-black">{challenge.roleTitle}</h2>
              </div>
              <Badge className="text-white">{challenge.challengeStatus}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/62">{challenge.challengeTitle}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/52">
              <CalendarClock className="h-4 w-4" />
              {challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : "No fixed deadline"}
            </div>
            {challenge.challengeStatus !== "submitted" && challenge.challengeStatus !== "matched" ? (
              <Link
                href={`/candidate/submit/${challenge.id}`}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-strong)]"
              >
                Submit Solution
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </article>
        ))}
        {!data?.length ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-6 text-center">
            <h2 className="text-lg font-bold">No accepted challenges yet</h2>
            <p className="mt-2 text-sm text-white/56">Find one in Discover when you are ready.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
