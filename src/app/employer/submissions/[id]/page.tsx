import { ExternalLink, Github } from "lucide-react";
import { AnalysisStatusRefresh } from "@/features/employer/components/analysis-status-refresh";
import { hiringService } from "@/lib/api/hiring-service";

export const dynamic = "force-dynamic";

export default async function EmployerSubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submission = await hiringService.getSubmission(id);

  if (!submission) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
        <h1 className="text-4xl font-black">Submission not found</h1>
      </main>
    );
  }

  const analysis = submission.analysis;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1.35fr)_420px] lg:px-10">
      <section className="overflow-hidden rounded-2xl border border-[var(--employer-line)] bg-black text-white">
        <video autoPlay muted loop playsInline src={submission.explanationVideoUrl} className="aspect-video w-full object-cover opacity-80" />
        <div className="p-5">
          <h1 className="text-3xl font-black">{submission.candidate.name}</h1>
          <p className="mt-2 text-sm text-white/62">{submission.candidate.headline}</p>
          <a
            href={submission.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex w-fit items-center gap-2 text-sm font-semibold text-white/82 transition hover:text-white"
          >
            <Github className="h-4 w-4" />
            {submission.githubUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
      <aside className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
        <p className="text-sm font-semibold text-[var(--muted)]">Project Analysis</p>
        <h2 className="mt-1 text-2xl font-black">Technical artifact review</h2>
        {analysis ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-end justify-between rounded-2xl bg-[var(--employer-surface-2)] p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Overall score</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Against this opportunity&apos;s challenge</p>
              </div>
              <p className="text-3xl font-black text-[var(--accent-strong)]">{analysis.overallScore}</p>
            </div>
            {[
              ["Architecture", analysis.architecture],
              ["Testing", analysis.testing],
              ["Code Quality", analysis.codeQuality],
              ["Documentation", analysis.documentation],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between text-sm font-semibold">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[var(--employer-surface-2)]">
                  <div className="h-2 rounded-full bg-[var(--accent-strong)]" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
            <p className="rounded-2xl bg-[var(--employer-surface-2)] p-4 text-sm leading-6 text-[var(--muted)]">
              {analysis.summary}
            </p>
            {analysis.strengths.length ? (
              <div>
                <p className="text-sm font-bold">Strengths</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--muted)]">
                  {analysis.strengths.map((strength) => (
                    <li key={strength}>• {strength}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {analysis.concerns.length ? (
              <div>
                <p className="text-sm font-bold">Considerations</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--muted)]">
                  {analysis.concerns.map((concern) => (
                    <li key={concern}>• {concern}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {analysis.evidence.length ? (
              <div>
                <p className="text-sm font-bold">Repository evidence</p>
                <div className="mt-2 space-y-2">
                  {analysis.evidence.map((evidence) => (
                    <article key={`${evidence.file}-${evidence.lines}`} className="rounded-xl bg-[var(--employer-surface-2)] p-3">
                      <p className="text-sm font-bold">{evidence.label}</p>
                      <p className="mt-1 font-mono text-xs text-[var(--accent-strong)]">
                        {evidence.file}:{evidence.lines}
                      </p>
                      <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{evidence.note}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-xs leading-5 text-[var(--muted)]">
              Advisory AI review of the repository only; verify cited files before making hiring decisions
              {submission.analysisModel ? ` · ${submission.analysisModel}` : ""}
              {submission.analysisCommitSha ? ` · ${submission.analysisCommitSha.slice(0, 12)}` : ""}
            </p>
          </div>
        ) : submission.status === "analysis_pending" || submission.status === "submitted" ? (
          <>
            <AnalysisStatusRefresh />
            <p className="mt-5 rounded-2xl bg-[var(--employer-surface-2)] p-4 text-sm leading-6 text-[var(--muted)]">
              Repository analysis is queued. This page will update automatically.
            </p>
          </>
        ) : submission.status === "analysis_failed" ? (
          <p className="mt-5 rounded-2xl bg-[#ff6a4d]/10 p-4 text-sm leading-6 text-[#b94d38]">
            {submission.analysisError ?? "Repository analysis could not be completed. Please try again later."}
          </p>
        ) : (
          <p className="mt-5 text-sm leading-6 text-[var(--muted)]">Project Analysis is still processing for this submission.</p>
        )}
      </aside>
    </main>
  );
}
