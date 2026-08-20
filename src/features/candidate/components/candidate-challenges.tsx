"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, MoreHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/state";
import { ApiError } from "@/lib/api/client";
import type { Opportunity } from "@/domain/types";
import { useCandidateChallenges, useRemoveCandidateChallenge } from "@/features/candidate/hooks";

type ChallengeItem = Opportunity & { challengeStatus: string };

function removalErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return "You already submitted a solution for this challenge.";
    if (error.status === 404) return "This challenge is no longer available.";
  }
  return "Could not remove challenge. Try again.";
}

export function CandidateChallenges() {
  const { data, isLoading, isError } = useCandidateChallenges();
  const removeMutation = useRemoveCandidateChallenge();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [challengeToRemove, setChallengeToRemove] = useState<ChallengeItem | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  if (isLoading) return <LoadingState label="Loading challenges..." />;

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-5 pb-28 pt-8">
      <h1 className="text-3xl font-black">Challenges</h1>
      <p className="mt-2 text-sm leading-6 text-white/58">Accepted projects waiting for your best work.</p>
      {isError ? (
        <p className="mt-5 rounded-2xl border border-[#f5b6a8]/24 bg-[#8a2d1f]/18 px-4 py-3 text-sm font-semibold text-[#ffe8e2]">
          Could not load your challenges. Try again.
        </p>
      ) : null}
      <div className="mt-7 space-y-4">
        {(data ?? []).map((challenge) => (
          <article key={challenge.id} className="relative rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">{challenge.employer.companyName}</p>
                <h2 className="mt-1 text-xl font-black">{challenge.roleTitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-white">{challenge.challengeStatus}</Badge>
                <button
                  type="button"
                  aria-label={`Open actions for ${challenge.roleTitle}`}
                  onClick={() => {
                    setRemoveError(null);
                    setMenuOpenId((current) => (current === challenge.id ? null : challenge.id));
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
            {menuOpenId === challenge.id ? (
              <div className="absolute right-4 top-14 z-20 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#111311]/95 p-1 text-sm shadow-2xl backdrop-blur-md">
                <Link
                  href={`/candidate/challenges/${challenge.id}`}
                  className="block rounded-xl px-3 py-2 font-semibold text-white/76 transition hover:bg-white/8 hover:text-white"
                >
                  View Challenge
                </Link>
                {challenge.challengeStatus !== "submitted" && challenge.challengeStatus !== "matched" ? (
                  <Link
                    href={`/candidate/submit/${challenge.id}`}
                    className="block rounded-xl px-3 py-2 font-semibold text-white/76 transition hover:bg-white/8 hover:text-white"
                  >
                    Submit Solution
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpenId(null);
                    setRemoveError(null);
                    setChallengeToRemove(challenge);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left font-semibold text-[#ffd3ca] transition hover:bg-[#8a2d1f]/24 hover:text-[#ffe8e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  Remove Challenge
                </button>
              </div>
            ) : null}
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
      {challengeToRemove ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/62 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-challenge-title"
            className="w-full max-w-[430px] rounded-[28px] border border-white/12 bg-[#101210] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="remove-challenge-title" className="text-xl font-black">
                  Remove this challenge?
                </h2>
                <p className="mt-2 text-sm font-semibold text-[var(--accent)]">
                  {challengeToRemove.roleTitle} - {challengeToRemove.employer.companyName}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cancel remove challenge"
                disabled={removeMutation.isPending}
                onClick={() => {
                  setChallengeToRemove(null);
                  setRemoveError(null);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/64">
              This will remove it from your accepted challenges. You can discover it again later if the opportunity is
              still active.
            </p>
            {removeError ? <p className="mt-4 text-sm font-semibold text-[#ffd3ca]">{removeError}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={removeMutation.isPending}
                onClick={() => {
                  setChallengeToRemove(null);
                  setRemoveError(null);
                }}
                className="h-11 rounded-full border border-white/10 bg-white/[0.06] text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removeMutation.isPending}
                onClick={async () => {
                  setRemoveError(null);
                  try {
                    await removeMutation.mutateAsync(challengeToRemove.id);
                    setChallengeToRemove(null);
                  } catch (error) {
                    setRemoveError(removalErrorMessage(error));
                  }
                }}
                className="h-11 rounded-full bg-[#9d3022] px-4 text-sm font-bold text-[#fff4ef] transition hover:bg-[#b13a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-70"
              >
                {removeMutation.isPending ? "Removing..." : "Remove Challenge"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
