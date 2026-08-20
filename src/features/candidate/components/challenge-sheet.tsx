"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Clock, MapPin, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Opportunity } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getCarePoints(opportunity: Opportunity) {
  const points = [
    `Practical judgment in ${opportunity.skills[0] ?? "the core stack"}`,
    "Clear trade-offs and implementation reasoning",
    "Readable structure that another engineer can extend",
    "Evidence through tests, documentation, or a short walkthrough",
  ];

  return points.slice(0, 4);
}

export function ChallengeSheet({
  opportunity,
  onClose,
  onAccept,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onAccept: () => Promise<void> | void;
}) {
  const reducedMotion = useReducedMotion();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const carePoints = useMemo(() => getCarePoints(opportunity), [opportunity]);

  const handleAccept = async () => {
    if (accepting || accepted) return;
    setAccepting(true);
    await onAccept();
    setAccepting(false);
    setAccepted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/56 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-[3px]">
      <motion.section
        aria-modal="true"
        role="dialog"
        initial={reducedMotion ? false : { y: 380, opacity: 0.72, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { y: 360, opacity: 0, scale: 0.985 }}
        transition={{ type: "spring", stiffness: 350, damping: 34 }}
        className="max-h-[82dvh] w-full max-w-[430px] overflow-auto rounded-[30px] border border-white/12 bg-[#0d0f0e]/96 p-5 text-[#f3f1ea] shadow-[0_28px_90px_rgba(0,0,0,0.62)]"
      >
        <div className="mx-auto mb-5 h-1 w-11 rounded-full bg-white/18" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#d8d6ce]/62">{opportunity.employer.companyName}</p>
            <h2 className="mt-1 text-xl font-black leading-tight">{opportunity.roleTitle}</h2>
          </div>
          <button
            aria-label="Close challenge details"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-7">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent)]/88">Challenge</p>
          <h3 className="mt-2 text-3xl font-black leading-[1.02]">{opportunity.challengeTitle}</h3>
          <p className="mt-4 text-[15px] leading-7 text-[#d8d6ce]/72">{opportunity.challengeDescription}</p>
        </div>

        <section className="mt-7">
          <h4 className="text-sm font-black">What we care about</h4>
          <div className="mt-3 space-y-3">
            {carePoints.map((point) => (
              <div key={point} className="flex gap-3 text-sm leading-6 text-[#d8d6ce]/76">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-7 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-center gap-2 text-sm text-[#d8d6ce]/76">
            <Clock className="h-4 w-4 text-[var(--accent)]" />
            Expected time: {opportunity.expectedChallengeDuration}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#d8d6ce]/76">
            <MapPin className="h-4 w-4 text-[var(--accent)]" />
            {opportunity.location} · {opportunity.workMode}
          </div>
          {opportunity.deadline ? (
            <p className="text-sm text-[#d8d6ce]/76">Deadline: {new Date(opportunity.deadline).toLocaleDateString()}</p>
          ) : null}
        </div>

        <section className="mt-7">
          <h4 className="mb-3 text-sm font-black">Relevant skills</h4>
          <div className="flex flex-wrap gap-2">
            {opportunity.skills.map((skill) => (
              <Badge key={skill} className="border-white/14 bg-white/[0.07] text-[#f3f1ea]/78">
                {skill}
              </Badge>
            ))}
          </div>
        </section>

        <AnimatePresence mode="popLayout">
          {accepted ? (
            <motion.div
              key="accepted"
              initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="mt-7 rounded-3xl border border-[var(--accent)]/28 bg-[var(--accent)]/10 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                  <Check className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-black">You accepted this challenge.</p>
                  <p className="mt-1 text-sm text-[#d8d6ce]/66">It is now waiting in your Challenges workspace.</p>
                </div>
              </div>
              <Link
                href="/candidate/challenges"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--accent)]/28 bg-white/[0.06] text-sm font-bold text-[var(--accent)] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                View Challenges
              </Link>
            </motion.div>
          ) : (
            <motion.div key="actions" className="mt-7 grid gap-3">
              <Button
                onClick={() => void handleAccept()}
                disabled={accepting}
                className="h-13 w-full text-base"
                size="lg"
              >
                <motion.span
                  animate={accepting && !reducedMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={{ duration: 0.42, repeat: accepting ? Infinity : 0 }}
                  className="inline-flex items-center gap-2"
                >
                  <Trophy className="h-5 w-5" />
                  {accepting ? "Accepting..." : "Accept Challenge"}
                </motion.span>
              </Button>
              <button
                onClick={onClose}
                className="h-11 rounded-full text-sm font-bold text-[#d8d6ce]/58 transition hover:text-[#f3f1ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Maybe later
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
