"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Play, Trophy } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { ReelHireBrand } from "@/components/branding/reelhire-brand";
import type { Opportunity } from "@/domain/types";

export function LandingHero({ opportunities }: { opportunities: Opportunity[] }) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 120, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 120, damping: 22 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4]);
  const active = opportunities[activeIndex] ?? opportunities[0];

  useEffect(() => {
    if (reducedMotion || opportunities.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % opportunities.length);
    }, 4200);
    return () => window.clearInterval(interval);
  }, [opportunities.length, reducedMotion]);

  return (
    <main className="landing-theme min-h-dvh overflow-hidden bg-[var(--landing-bg)] text-[var(--landing-text)]">
      <section
        className="relative flex min-h-dvh items-center px-5 py-8 sm:px-8 lg:px-14"
        onPointerMove={(event) => {
          if (reducedMotion) return;
          const rect = event.currentTarget.getBoundingClientRect();
          pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
          pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
        }}
        onPointerLeave={() => {
          pointerX.set(0);
          pointerY.set(0);
        }}
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(var(--accent-rgb),0.14),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(var(--candidate-info-rgb),0.16),transparent_24%)]" />
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-[0.16] mix-blend-multiply"
          src={active?.videoUrl ?? "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4"}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(245,241,232,0.96),rgba(245,241,232,0.88)_48%,rgba(34,34,34,0.86))]" />
        <div className="relative z-10 grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-end">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <Link href="/" className="mb-10 inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] sm:mb-12">
              <ReelHireBrand variant="hero" priority />
            </Link>
            <motion.h1
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.34 }}
              className="max-w-4xl text-5xl font-black leading-[0.95] tracking-normal sm:text-7xl lg:text-8xl"
            >
              Don&apos;t send a CV. Show what you can build.
            </motion.h1>
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.3 }}
              className="mt-7 max-w-2xl text-lg leading-8 text-[var(--landing-muted)]/82"
            >
              Browse short role pitches, accept real project challenges, and turn proof of work into the next hiring step.
            </motion.p>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.3 }}
              className="mt-10 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/candidate/feed"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent)] px-6 font-bold text-[var(--accent-ink)] shadow-[0_18px_46px_var(--accent-shadow)] transition hover:bg-[var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-ink)]/82" />
                Find your next challenge
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/employer/dashboard"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-[#222]/14 bg-[#222] px-6 font-bold text-[#fcfaf5] shadow-[0_16px_38px_rgba(34,34,34,0.18)] transition hover:bg-[#34312d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
              >
                I&apos;m hiring
                <BriefcaseBusiness className="h-5 w-5" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.18, type: "spring", stiffness: 180, damping: 24 }}
            style={reducedMotion ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
            className="mx-auto hidden w-full max-w-[390px] rounded-[30px] border border-white/12 bg-black/32 p-3 shadow-2xl backdrop-blur-xl lg:block"
          >
            <div className="relative aspect-[9/16] overflow-hidden rounded-[24px] bg-black">
              {active ? (
                <video
                  key={active.id}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover opacity-72"
                  src={active.videoUrl}
                />
              ) : (
                <div className="video-gradient absolute inset-0" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-[68%] bg-[linear-gradient(180deg,transparent,rgba(5,6,6,0.62)_58%,rgba(5,6,6,0.94))]" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <motion.div
                  animate={reducedMotion ? undefined : { y: [0, -5, 0] }}
                  transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-black/28 backdrop-blur"
                >
                  <Play className="h-5 w-5 fill-[#f4f1e8] text-[#f4f1e8]" />
                </motion.div>
                <motion.div
                  key={active?.id ?? "fallback"}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  <p className="text-sm font-semibold text-[#d8d6ce]/64">{active?.employer.companyName ?? "Nova Systems"}</p>
                  <h2 className="mt-1 text-3xl font-black">{active?.roleTitle ?? "Backend Engineer"}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#dedbd2]/72">
                    {active?.shortDescription ?? "Build an incident-aware queue for delayed shipments."}
                  </p>
                  <div className="mt-5 border-l border-[var(--accent)]/56 pl-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Challenge</p>
                    <p className="mt-1 text-sm font-bold text-[#f4f1e8]">{active?.challengeTitle ?? "Design an incident-aware job queue"}</p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/32 px-4 py-3 text-sm font-bold text-[#f4f1e8] backdrop-blur">
                    <Trophy className="h-4 w-4 text-[var(--accent)]" />
                    Accept Challenge
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
