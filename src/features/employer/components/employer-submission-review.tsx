"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Github, Loader2, Sparkles, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { useAnalyzeSubmission, useEmployerSubmissionReaction, useRequestInterview } from "@/features/matches/hooks";
import { ApiError } from "@/lib/api/client";
import type { Match, Opportunity, ProjectEvaluation, Submission } from "@/domain/types";

type EmployerSubmissionReviewProps = {
  submission: Submission;
  opportunity: Opportunity;
};

function decisionErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return "This submission is no longer available.";
    if (error.status === 403) return "You don't have permission to review this submission.";
    if (error.status === 409) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Could not save this review decision. Try again.";
}

function analysisErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 422) return "This must be a public GitHub repository URL.";
    if (error.status === 403) return "You don't have permission to analyze this submission.";
    if (error.status === 404) return "This submission is no longer available.";
    if (error.status === 502) return "Could not clone or inspect the public GitHub repository.";
    if (error.status === 503) return "Project evaluator is not configured or unavailable.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Could not analyze this repository. Try again.";
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[var(--muted)]">{label}</span>
        <span className="font-black text-[var(--employer-ink)]">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4ddd2]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.28 }}
          className="h-full rounded-full bg-[#171716]"
        />
      </div>
    </div>
  );
}

function ProjectEvaluationPanel({
  evaluation,
  isPending,
  error,
  onAnalyze,
}: {
  evaluation?: ProjectEvaluation;
  isPending: boolean;
  error: string | null;
  onAnalyze: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
      <p className="text-sm font-semibold text-[var(--muted)]">Project Evaluation</p>
      {evaluation?.status === "completed" ? (
        <div className="mt-3 space-y-5">
          <div>
            <div className="flex items-end gap-2">
              <h2 className="text-4xl font-black">{evaluation.overallScore ?? "-"}</h2>
              <p className="pb-1 text-sm font-bold text-[var(--muted)]">/ 100</p>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">Evaluated against the submitted challenge.</p>
          </div>

          <div className="space-y-3">
            <ScoreRow label="Challenge Completion" value={evaluation.challengeCompletion} />
            <ScoreRow label="Code Quality" value={evaluation.codeQuality} />
            <ScoreRow label="Architecture" value={evaluation.architecture} />
            <ScoreRow label="Testing" value={evaluation.testing} />
            <ScoreRow label="Documentation" value={evaluation.documentation} />
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Summary</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--employer-ink)]">{evaluation.summary}</p>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Strengths</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--employer-ink)]">
              {evaluation.strengths.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Concerns</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--employer-ink)]">
              {evaluation.concerns.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>

          <details className="rounded-xl border border-[var(--employer-line)] bg-white/70 p-4">
            <summary className="cursor-pointer text-sm font-black">Evidence</summary>
            <div className="mt-3 space-y-3">
              {evaluation.evidence.map((item, index) => (
                <div key={`${item.filePath ?? "repo"}-${index}`} className="rounded-xl border border-[var(--employer-line)] bg-white p-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{item.category}</p>
                  {item.filePath ? <p className="mt-1 break-all text-sm font-bold">{item.filePath}</p> : null}
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.observation}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="mt-3">
          <h2 className="text-2xl font-black">No analysis yet</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Run a static repository evaluation against this challenge. ReelHire will inspect public GitHub files and cite concrete evidence.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={onAnalyze}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#171716] px-4 text-sm font-bold text-[#f7f4eb] transition hover:-translate-y-0.5 hover:bg-[#2a2925] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[var(--accent)]" />}
            {isPending ? "Analyzing repository..." : "Analyze Repository"}
          </button>
        </div>
      )}
      {error ? (
        <p className="mt-4 rounded-2xl border border-[#efc7b8] bg-[#fff4ed] px-4 py-3 text-sm font-semibold text-[#8c321f]">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function EmployerSubmissionReview({ submission, opportunity }: EmployerSubmissionReviewProps) {
  const decision = useEmployerSubmissionReaction();
  const analysis = useAnalyzeSubmission();
  const interview = useRequestInterview();
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<ProjectEvaluation | undefined>(submission.projectEvaluation);
  const [match, setMatch] = useState<Match | null>(null);

  const currentReaction = decision.data?.reaction.reaction ?? submission.employerReaction?.reaction;
  const currentMatchId = decision.data?.match?.id ?? match?.id ?? submission.matchId;
  const isMatched = Boolean(currentMatchId || submission.matchStatus === "matched" || decision.data?.match);

  const react = async (reaction: "accepted" | "passed") => {
    setError(null);
    try {
      const response = await decision.mutateAsync({ submissionId: submission.id, reaction });
      if (response.match) setMatch(response.match);
    } catch (nextError) {
      setError(decisionErrorMessage(nextError));
    }
  };

  const analyzeRepository = async () => {
    setAnalysisError(null);
    try {
      const result = await analysis.mutateAsync({ submissionId: submission.id });
      setEvaluation(result);
    } catch (nextError) {
      setAnalysisError(analysisErrorMessage(nextError));
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
      <Link href={`/employer/opportunities/${opportunity.id}/submissions`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
        <ArrowLeft className="h-4 w-4" />
        Submissions
      </Link>

      {isMatched ? (
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mt-6 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-5"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#5f9e26]">Match</p>
              <h1 className="mt-2 text-3xl font-black">You both chose to continue.</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {submission.candidate.name} matched with {opportunity.roleTitle} at {opportunity.employer.companyName}.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={submission.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--employer-line)] bg-white px-4 text-sm font-bold text-[var(--employer-ink)] transition hover:-translate-y-0.5"
              >
                <Github className="h-4 w-4" />
                View project
              </a>
              <button
                type="button"
                disabled={!currentMatchId || interview.isPending || submission.matchStatus === "interview_requested"}
                onClick={() => currentMatchId && void interview.mutate(currentMatchId)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171716] px-4 text-sm font-bold text-[#f7f4eb] transition hover:bg-[#2a2925] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                {interview.isPending ? "Requesting..." : "Invite to interview"}
              </button>
            </div>
          </div>
        </motion.section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_420px]">
        <section className="overflow-hidden rounded-2xl border border-[var(--employer-line)] bg-black text-white">
          <video controls playsInline src={submission.explanationVideoUrl} className="aspect-video w-full bg-black object-contain" />
          <div className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-black">{submission.candidate.name}</h1>
                <p className="mt-2 text-sm text-white/62">{submission.candidate.headline}</p>
                <p className="mt-2 text-sm text-white/48">{submission.candidate.location}</p>
              </div>
              {currentReaction ? <Badge>{currentReaction}</Badge> : <Badge>Awaiting review</Badge>}
            </div>
            <a
              href={submission.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 break-all text-sm font-semibold text-white transition hover:text-[var(--accent)]"
            >
              <Github className="h-4 w-4 shrink-0" />
              {submission.githubUrl}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
            <p className="text-sm font-semibold text-[var(--muted)]">Role / Challenge</p>
            <h2 className="mt-1 text-2xl font-black">{opportunity.roleTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{opportunity.challengeTitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {opportunity.skills.slice(0, 4).map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </section>

          <ProjectEvaluationPanel
            evaluation={evaluation}
            isPending={analysis.isPending}
            error={analysisError}
            onAnalyze={() => void analyzeRepository()}
          />

          <section className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
            <p className="text-sm font-semibold text-[var(--muted)]">Decision</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={decision.isPending || isMatched}
                onClick={() => void react("passed")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#d8cbc0] bg-white px-4 text-sm font-bold text-[#7b2d1f] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {decision.isPending && currentReaction !== "accepted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Pass
              </button>
              <button
                type="button"
                disabled={decision.isPending || isMatched}
                onClick={() => void react("accepted")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#171716] px-4 text-sm font-bold text-[#f7f4eb] transition hover:-translate-y-0.5 hover:bg-[#2a2925] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {decision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />}
                {decision.isPending ? "Reviewing..." : "Accept Candidate"}
              </button>
            </div>
            {error ? (
              <p className="mt-4 rounded-2xl border border-[#efc7b8] bg-[#fff4ed] px-4 py-3 text-sm font-semibold text-[#8c321f]">
                {error}
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
