import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { hiringService } from "@/lib/api/hiring-service";

export const dynamic = "force-dynamic";

export default async function CandidateMatchesPage() {
  const matches = await hiringService.getCandidateMatches();

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] px-5 pb-28 pt-8">
      <Sparkles className="h-8 w-8 text-[var(--accent)]" />
      <h1 className="mt-4 text-3xl font-black">Matches</h1>
      <p className="mt-3 text-sm leading-6 text-white/62">Companies that chose to continue with your submitted challenge appear here.</p>

      <div className="mt-7 space-y-4">
        {matches.map((match) => (
          <article key={match.id} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm font-bold text-[var(--accent)]">{match.opportunity.employer.companyName}</p>
            <h2 className="mt-2 text-2xl font-black">{match.opportunity.roleTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Matched {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(match.createdAt))}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-bold text-white/72">
                {match.status.replace("_", " ")}
              </span>
              <Link
                href={`/candidate/challenges/${match.opportunity.id}`}
                className="inline-flex items-center gap-1 text-sm font-bold text-white"
              >
                View challenge
                <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
              </Link>
            </div>
          </article>
        ))}
        {!matches.length ? (
          <section className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <h2 className="text-xl font-black">No matches yet</h2>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Submit a challenge project and employer matches will appear here when there is mutual interest.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
