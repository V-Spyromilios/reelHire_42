import { EmployerOpportunitiesList } from "@/features/employer/components/employer-opportunities-list";
import { hiringService } from "@/lib/api/hiring-service";

export const dynamic = "force-dynamic";

export default async function EmployerOpportunitiesPage() {
  const opportunities = await hiringService.getEmployerOpportunities();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
      <p className="text-sm font-semibold text-[var(--muted)]">Opportunity library</p>
      <h1 className="mt-2 text-4xl font-black">Active opportunities</h1>
      <EmployerOpportunitiesList initialOpportunities={opportunities} />
    </main>
  );
}
