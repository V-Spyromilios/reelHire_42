import type { CandidateReactionKind, EmployerReactionKind } from "@/domain/types";
import { currentCandidateId, currentEmployerId } from "@/data/mocks/hiring-data";
import { createHiringRepository } from "@/lib/api/repository-factory";
import type { CreateOpportunityInput, CreateSubmissionInput, HiringRepository } from "@/repositories/contracts";

class HiringService {
  constructor(private readonly repository: HiringRepository) {}

  getOpportunitiesFeed() {
    return this.repository.getOpportunitiesFeed();
  }

  getOpportunity(id: string) {
    return this.repository.getOpportunity(id);
  }

  reactToOpportunity(
    opportunityId: string,
    reaction: CandidateReactionKind,
    watchTimeMs = 12_400,
    videoDurationMs = 24_000,
  ) {
    return this.repository.createCandidateReaction({
      candidateId: currentCandidateId,
      opportunityId,
      reaction,
      watchTimeMs,
      videoDurationMs,
    });
  }

  getCandidateChallenges() {
    return this.repository.getCandidateChallenges(currentCandidateId);
  }

  createSubmission(input: CreateSubmissionInput) {
    return this.repository.createSubmission(input);
  }

  getEmployerOpportunities() {
    return this.repository.getEmployerOpportunities(currentEmployerId);
  }

  createOpportunity(input: CreateOpportunityInput) {
    return this.repository.createOpportunity(currentEmployerId, input);
  }

  deleteOpportunity(id: string) {
    return this.repository.deleteOpportunity(id);
  }

  getOpportunityAnalytics(opportunityId: string) {
    return this.repository.getOpportunityAnalytics(opportunityId);
  }

  getOpportunitySubmissions(opportunityId: string) {
    return this.repository.getOpportunitySubmissions(opportunityId);
  }

  getSubmission(id: string) {
    return this.repository.getSubmission(id);
  }

  reactToSubmission(submissionId: string, reaction: EmployerReactionKind) {
    return this.repository.createEmployerReaction({
      employerId: currentEmployerId,
      submissionId,
      reaction,
    });
  }

  getMatches() {
    return this.repository.getMatches();
  }

  requestInterview(matchId: string) {
    return this.repository.requestInterview(matchId);
  }
}

export const hiringService = new HiringService(createHiringRepository());
