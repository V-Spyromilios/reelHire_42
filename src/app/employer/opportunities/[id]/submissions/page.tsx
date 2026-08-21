import Link from "next/link";
import { Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hiringService } from "@/lib/api/hiring-service";

export const dynamic = "force-dynamic";

export default async function OpportunitySubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [opportunity, opportunitySubmissions] = await Promise.all([
    hiringService.getOpportunity(id),
    hiringService.getOpportunitySubmissions(id),
  ]);

  if (!opportunity) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
        <h1 className="text-4xl font-black">Opportunity not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
      <p className="text-sm font-semibold text-[var(--muted)]">Project submissions</p>
      <h1 className="mt-2 text-4xl font-black">{opportunity.roleTitle}</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {opportunitySubmissions.map((submission) => (
          <Link
            key={submission.id}
            href={`/employer/submissions/${submission.id}`}
            className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="h-12 w-12 shrink-0 rounded-full bg-[var(--employer-surface-2)] bg-cover bg-center"
                style={{ backgroundImage: `url(${submission.candidate.avatarUrl})` }}
              />
              <div>
                <h2 className="text-xl font-black">{submission.candidate.name}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{submission.candidate.headline}</p>
              </div>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
              <Github className="h-4 w-4" />
              {submission.githubUrl.replace("https://github.com/", "")}
            </p>
            <div className="mt-4">
              <Badge>
                {submission.analysis
                  ? "Analysis ready"
                  : submission.status === "analysis_failed"
                    ? "Analysis unavailable"
                    : "Analysis queued"}
              </Badge>
            </div>
          </Link>
        ))}
        {!opportunitySubmissions.length ? (
          <article className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-8">
            <h2 className="text-xl font-black">No submissions yet</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Submitted projects for this opportunity will appear here.</p>
          </article>
        ) : null}
      </div>
    </main>
  );
}
