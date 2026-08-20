import { CandidateSubmissionFlow } from "@/features/candidate/components/candidate-submission-flow";

export default async function CandidateSubmitPage({ params }: { params: Promise<{ opportunityId: string }> }) {
  const { opportunityId } = await params;
  return <CandidateSubmissionFlow opportunityId={opportunityId} />;
}
