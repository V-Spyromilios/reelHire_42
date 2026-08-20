import { hiringService } from "@/lib/api/hiring-service";

export const dynamic = "force-dynamic";

export default async function OpportunityAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await hiringService.getOpportunity(id);
  const metrics = await hiringService.getOpportunityAnalytics(id);

  if (!opportunity || !metrics) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
        <h1 className="text-4xl font-black">Analytics not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
      <p className="text-sm font-semibold text-[var(--muted)]">Pitch Performance</p>
      <h1 className="mt-2 text-4xl font-black">{opportunity.roleTitle}</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Metric label="Impressions" value={metrics.impressions.toLocaleString()} />
        <Metric label="Unique views" value={metrics.uniqueViews.toLocaleString()} />
        <Metric label="Accept rate" value={`${Math.round(metrics.acceptanceRate * 100)}%`} />
        <Metric label="Submissions" value={metrics.submissionsCount.toString()} />
      </div>
      <p className="mt-6 rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5 text-sm leading-6 text-[var(--muted)]">
        {metrics.insight}
      </p>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[var(--employer-line)] bg-[var(--employer-surface)] p-5">
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </article>
  );
}
