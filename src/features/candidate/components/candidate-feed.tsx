"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Bookmark, Check, ChevronDown, ChevronUp, Eye, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingState } from "@/components/ui/state";
import type { CandidateReactionKind, Opportunity } from "@/domain/types";
import { useOpportunitiesFeed, useOpportunityReaction } from "@/features/opportunities/hooks";
import { ChallengeSheet } from "./challenge-sheet";

type FeedReaction = Extract<CandidateReactionKind, "accepted" | "passed" | "saved">;

const decisionThreshold = 118;
const verticalThreshold = 92;
const navSafeSpace = "calc(4.75rem + env(safe-area-inset-bottom))";

function OnboardingHint({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="pointer-events-none absolute left-5 top-6 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-2 text-[11px] font-semibold text-white/58 backdrop-blur-md"
        >
          <Eye className="h-3.5 w-3.5 text-[var(--accent)]" />
          Swipe to browse and decide
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DecisionFeedback({
  acceptOpacity,
  passOpacity,
}: {
  acceptOpacity: ReturnType<typeof useTransform<number, number>>;
  passOpacity: ReturnType<typeof useTransform<number, number>>;
}) {
  return (
    <>
      <motion.div
        style={{ opacity: passOpacity }}
        className="pointer-events-none absolute left-5 top-[30%] z-20 rounded-full border border-white/16 bg-black/42 px-4 py-2 text-xs font-black tracking-wide text-white shadow-2xl backdrop-blur"
      >
        PASS
      </motion.div>
      <motion.div
        style={{ opacity: acceptOpacity }}
        className="pointer-events-none absolute right-5 top-[30%] z-20 rounded-full border border-[var(--accent)]/45 bg-black/42 px-4 py-2 text-xs font-black tracking-wide text-[var(--accent)] shadow-2xl backdrop-blur"
      >
        ACCEPT CHALLENGE
      </motion.div>
    </>
  );
}

function FeedCard({
  opportunity,
  onInspect,
  onReact,
  onNext,
  onPrevious,
  onInteraction,
  showOnboarding,
  accepting,
  accepted,
  onVideoDuration,
}: {
  opportunity: Opportunity;
  onInspect: () => void;
  onReact: (reaction: FeedReaction) => void;
  onNext: () => void;
  onPrevious: () => void;
  onInteraction: () => void;
  showOnboarding: boolean;
  accepting: boolean;
  accepted: boolean;
  onVideoDuration: (durationMs: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-180, 0, 180], [-4, 0, 4]);
  const acceptOpacity = useTransform(x, [18, decisionThreshold], [0, 1]);
  const passOpacity = useTransform(x, [-decisionThreshold, -18], [1, 0]);

  const resetCard = () => {
    void animate(x, 0, { type: "spring", stiffness: 360, damping: 30 });
    void animate(y, 0, { type: "spring", stiffness: 360, damping: 30 });
  };

  return (
    <motion.article
      key={opportunity.id}
      drag={reducedMotion ? false : true}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      style={{ x, y, rotate }}
      onDragStart={onInteraction}
      onDragEnd={(_, info) => {
        if (info.offset.x > decisionThreshold) {
          onReact("accepted");
          return;
        }
        if (info.offset.x < -decisionThreshold) {
          onReact("passed");
          return;
        }
        if (info.offset.y < -verticalThreshold) {
          onNext();
          return;
        }
        if (info.offset.y > verticalThreshold) {
          onPrevious();
          return;
        }
        resetCard();
      }}
      initial={reducedMotion ? false : { y: 34, opacity: 0, scale: 0.985 }}
      animate={{ y: 0, opacity: 1, scale: accepted ? 0.985 : 1 }}
      exit={reducedMotion ? { opacity: 0 } : { y: -54, opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 250, damping: 28 }}
      className="absolute inset-0 touch-none overflow-hidden bg-black"
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-[0.74]"
        src={opportunity.videoUrl}
        onLoadedMetadata={(event) => onVideoDuration(Math.round(event.currentTarget.duration * 1000))}
      />
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-[linear-gradient(180deg,rgba(5,6,6,0)_0%,rgba(5,6,6,0.26)_36%,rgba(5,6,6,0.72)_70%,rgba(5,6,6,0.94)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(5,6,6,0.44),rgba(5,6,6,0))]" />

      <OnboardingHint visible={showOnboarding} />
      <DecisionFeedback acceptOpacity={acceptOpacity} passOpacity={passOpacity} />

      <div
        data-testid="candidate-feed-bottom-stack"
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end px-5 pt-24"
        style={{ minHeight: "58%", paddingBottom: navSafeSpace }}
      >
        <div className="pointer-events-auto space-y-4">
          <section data-testid="candidate-feed-role-info" className="max-w-[330px]">
            <p className="text-sm font-semibold text-[#d8d6ce]/68">{opportunity.employer.companyName}</p>
            <h1 className="mt-1 text-[2rem] font-black leading-[1.02] text-[#f4f1e8]">{opportunity.roleTitle}</h1>
            <p className="mt-3 line-clamp-2 text-[15px] leading-6 text-[#dedbd2]/72">{opportunity.shortDescription}</p>
          </section>

          <button
            data-testid="candidate-feed-challenge-teaser"
            onClick={() => {
              onInteraction();
              onInspect();
            }}
            className="group block max-w-[335px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          >
            <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]/85">
              Challenge
            </span>
            <span className="mt-1 block text-base font-black leading-5 text-[#f0eee7]">{opportunity.challengeTitle}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#f0eee7]/72 transition group-hover:text-[#f0eee7]">
              View challenge <span aria-hidden>→</span>
            </span>
          </button>

          <div data-testid="candidate-feed-actions" className="grid grid-cols-[auto_auto_1fr] items-center gap-3">
            <button
              aria-label="Pass"
              onClick={() => {
                onInteraction();
                onReact("passed");
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-black/28 text-[#f4f1e8] backdrop-blur-md transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              aria-label="Save"
              onClick={() => {
                onInteraction();
                onReact("saved");
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-black/28 text-[#f4f1e8] backdrop-blur-md transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <Bookmark className="h-5 w-5" />
            </button>
            <motion.button
              aria-live="polite"
              disabled={accepting}
              onClick={() => {
                onInteraction();
                onReact("accepted");
              }}
              whileTap={reducedMotion ? undefined : { scale: 0.985 }}
              className="inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-full border border-white/14 bg-black/30 px-4 text-sm font-bold text-[#f4f1e8] shadow-[0_14px_40px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-[var(--accent)]/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-80"
            >
              {accepted ? <Check className="h-4 w-4 text-[var(--accent)]" /> : <Trophy className="h-4 w-4 text-[var(--accent)]" />}
              <span className="truncate">{accepted ? "Challenge accepted" : accepting ? "Accepting..." : "Accept Challenge"}</span>
            </motion.button>
          </div>

          <AnimatePresence>
            {accepted ? (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className="rounded-2xl border border-[var(--accent)]/22 bg-[var(--accent)]/10 px-4 py-3 text-sm text-[#f4f1e8]"
              >
                <p className="font-bold">You accepted this challenge.</p>
                <Link href="/candidate/challenges" className="mt-1 inline-flex font-semibold text-[var(--accent)]">
                  View Challenges →
                </Link>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="pointer-events-auto absolute right-4 top-5 z-20 hidden gap-2 sm:flex">
        <button
          aria-label="Previous opportunity"
          onClick={() => {
            onInteraction();
            onPrevious();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-black/20 text-white/52 backdrop-blur-md transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          aria-label="Next opportunity"
          onClick={() => {
            onInteraction();
            onNext();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-black/20 text-white/52 backdrop-blur-md transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}

export function CandidateFeed() {
  const { data, isLoading, isError } = useOpportunitiesFeed();
  const reactionMutation = useOpportunityReaction();
  const [index, setIndex] = useState(0);
  const [sheetOpportunity, setSheetOpportunity] = useState<Opportunity | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem("reelhire-feed-onboarded") !== "true",
  );
  const activeStartedAt = useRef(0);
  const videoDurations = useRef<Record<string, number>>({});
  const opportunities = useMemo(() => data ?? [], [data]);
  const active = opportunities[index];

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("reelhire-feed-onboarded", "true");
    }
  }, []);

  const next = useCallback(() => {
    dismissOnboarding();
    setAcceptedId(null);
    setAcceptingId(null);
    setIndex((current) => Math.min(current + 1, Math.max(opportunities.length - 1, 0)));
  }, [dismissOnboarding, opportunities.length]);

  const previous = useCallback(() => {
    dismissOnboarding();
    setAcceptedId(null);
    setAcceptingId(null);
    setIndex((current) => Math.max(current - 1, 0));
  }, [dismissOnboarding]);

  const getWatchMetrics = useCallback(
    (opportunityId: string) => ({
      watchTimeMs: activeStartedAt.current > 0 ? Math.max(0, Date.now() - activeStartedAt.current) : 0,
      videoDurationMs: videoDurations.current[opportunityId] ?? 24_000,
    }),
    [],
  );

  const react = useCallback(
    async (reaction: FeedReaction, options?: { advance?: boolean }) => {
      if (!active) return;
      dismissOnboarding();
      const shouldAdvance = options?.advance ?? reaction !== "saved";
      const metrics = getWatchMetrics(active.id);

      if (reaction === "accepted") {
        setAcceptingId(active.id);
      }

      await reactionMutation.mutateAsync({ opportunityId: active.id, reaction, ...metrics });

      if (reaction === "accepted") {
        setAcceptingId(null);
        setAcceptedId(active.id);
        window.setTimeout(() => {
          if (shouldAdvance) next();
        }, 950);
        return;
      }

      if (shouldAdvance) {
        next();
      }
    },
    [active, dismissOnboarding, getWatchMetrics, next, reactionMutation],
  );

  useEffect(() => {
    activeStartedAt.current = Date.now();
  }, [active?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") next();
      if (event.key === "ArrowUp") previous();
      if (event.key === "ArrowLeft") void react("passed");
      if (event.key === "ArrowRight") void react("accepted");
      if (event.key.toLowerCase() === "s") void react("saved", { advance: false });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous, react]);

  if (isLoading) return <LoadingState label="Loading opportunities..." />;
  if (isError || !active) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-black">No challenges in the feed</h1>
          <p className="mt-2 text-white/60">The next batch of project pitches will appear here.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-black">
      <div className="relative h-dvh overflow-hidden">
        <AnimatePresence mode="popLayout">
          <FeedCard
            key={active.id}
            opportunity={active}
            onInspect={() => setSheetOpportunity(active)}
            onReact={(reaction) => void react(reaction, { advance: reaction !== "saved" })}
            onNext={next}
            onPrevious={previous}
            onInteraction={dismissOnboarding}
            showOnboarding={showOnboarding}
            accepting={acceptingId === active.id}
            accepted={acceptedId === active.id}
            onVideoDuration={(durationMs) => {
              videoDurations.current[active.id] = durationMs;
            }}
          />
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {sheetOpportunity ? (
          <ChallengeSheet
            opportunity={sheetOpportunity}
            onClose={() => setSheetOpportunity(null)}
            onAccept={async () => {
              await react("accepted", { advance: false });
            }}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
