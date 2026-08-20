import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hiringService } from "@/lib/api/hiring-service";

export const dynamic = "force-dynamic";

export default async function EmployerOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await hiringService.getOpportunity(id);

  if (!opportunity) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
        <h1 className="text-4xl font-black">Opportunity not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
      <p className="text-sm font-semibold text-[var(--muted)]">{opportunity.employer.companyName}</p>
      <h1 className="mt-2 text-4xl font-black">{opportunity.roleTitle}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">{opportunity.challengeDescription}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {opportunity.skills.map((skill) => (
          <Badge key={skill}>{skill}</Badge>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href={`/employer/opportunities/${opportunity.id}/analytics`}
          className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5"
        >
          <ArrowUpRight className="h-5 w-5" />
          <h2 className="mt-6 text-2xl font-black">Pitch Performance</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Review conversion and decision timing.</p>
        </Link>
        <Link
          href={`/employer/opportunities/${opportunity.id}/submissions`}
          className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5"
        >
          <ArrowUpRight className="h-5 w-5" />
          <h2 className="mt-6 text-2xl font-black">Submissions</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Browse candidate projects and Project Analysis.</p>
        </Link>
      </div>
    </main>
  );
}
