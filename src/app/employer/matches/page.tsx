import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import { hiringService } from "@/lib/api/hiring-service";
import type { Submission } from "@/domain/types";

export const dynamic = "force-dynamic";

export default async function EmployerMatchesPage() {
  const matches = await hiringService.getMatches();
  const submissionsById = new Map(
    (
      await Promise.all(
        matches.map(async (match) => {
          const submission = await hiringService.getSubmission(match.submissionId);
          return [match.submissionId, submission] as const;
        }),
      )
    ).filter((item): item is readonly [string, Submission] => Boolean(item[1])),
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
      <p className="text-sm font-semibold text-[var(--muted)]">Mutual matches</p>
      <h1 className="mt-2 text-4xl font-black">Ready for the next step</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {matches.map((match) => {
          const submission = submissionsById.get(match.submissionId);
          return (
          <article key={match.id} className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
            <p className="text-sm font-semibold text-[var(--muted)]">{match.opportunity.roleTitle}</p>
            <h2 className="mt-2 text-2xl font-black">{match.candidate.name}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{match.candidate.headline}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <p className="inline-flex rounded-full bg-[#171716] px-3 py-1 text-xs font-bold text-white">
                {match.status.replace("_", " ")}
              </p>
              <p className="inline-flex rounded-full border border-[var(--employer-line)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(match.createdAt))}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/employer/submissions/${match.submissionId}`}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171716] px-4 text-sm font-bold text-[#f7f4eb]"
              >
                View project
                <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
              </Link>
              {submission ? (
                <a
                  href={submission.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--employer-line)] bg-white px-4 text-sm font-bold"
                >
                  <Github className="h-4 w-4" />
                  Repository
                </a>
              ) : null}
            </div>
          </article>
          );
        })}
        {!matches.length ? (
          <section className="rounded-2xl border border-dashed border-[var(--employer-line)] bg-[var(--employer-surface)] p-8">
            <h2 className="text-xl font-black">No matches yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Accepted candidate submissions will appear here once both sides have chosen to continue.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
