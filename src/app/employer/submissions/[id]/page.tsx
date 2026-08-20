import { Github } from "lucide-react";
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
          <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
            <Github className="h-4 w-4" />
            {submission.githubUrl}
          </p>
        </div>
      </section>
      <aside className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
        <p className="text-sm font-semibold text-[var(--muted)]">Project Analysis</p>
        <h2 className="mt-1 text-2xl font-black">Technical artifact review</h2>
        {analysis ? (
          <div className="mt-5 space-y-4">
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
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-[var(--muted)]">Project Analysis is still processing for this submission.</p>
        )}
      </aside>
    </main>
  );
}
