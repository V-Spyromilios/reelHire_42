import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmployerSubmissionReview } from "@/features/employer/components/employer-submission-review";
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

  const opportunity = await hiringService.getOpportunity(submission.opportunityId);

  if (!opportunity) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
        <Link href="/employer/opportunities" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <ArrowLeft className="h-4 w-4" />
          Opportunities
        </Link>
        <h1 className="mt-6 text-4xl font-black">Opportunity not found</h1>
      </main>
    );
  }

  return <EmployerSubmissionReview submission={submission} opportunity={opportunity} />;
}
