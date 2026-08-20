import { hiringService } from "@/lib/api/hiring-service";

export const dynamic = "force-dynamic";

export default async function EmployerMatchesPage() {
  const matches = await hiringService.getMatches();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
      <p className="text-sm font-semibold text-[var(--muted)]">Mutual matches</p>
      <h1 className="mt-2 text-4xl font-black">Ready for the next step</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {matches.map((match) => (
          <article key={match.id} className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
            <p className="text-sm font-semibold text-[var(--muted)]">{match.opportunity.employer.companyName}</p>
            <h2 className="mt-2 text-2xl font-black">{match.candidate.name}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{match.opportunity.roleTitle}</p>
            <p className="mt-5 inline-flex rounded-full bg-[#171716] px-3 py-1 text-xs font-bold text-white">
              {match.status.replace("_", " ")}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
