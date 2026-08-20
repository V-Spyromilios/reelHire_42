import type {
  CandidateReaction,
  EmployerReaction,
  Match,
  Opportunity,
  Submission,
} from "@/domain/types";
import {
  analytics,
  candidateReactions,
  candidates,
  currentCandidateId,
  employers,
  matches,
  opportunities,
  submissions,
} from "@/data/mocks/hiring-data";
import type {
  CreateCandidateReactionInput,
  CreateEmployerReactionInput,
  CreateOpportunityInput,
  CreateSubmissionInput,
  HiringRepository,
} from "../contracts";

const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

const mutableCandidateReactions: CandidateReaction[] = [...candidateReactions];
const mutableSubmissions: Submission[] = [...submissions];
const mutableMatches: Match[] = [...matches];
const mutableOpportunities: Opportunity[] = [...opportunities];

export class MockHiringRepository implements HiringRepository {
  async getOpportunitiesFeed() {
    await wait();
    return mutableOpportunities;
  }

  async getOpportunity(id: string) {
    await wait();
    return mutableOpportunities.find((opportunity) => opportunity.id === id) ?? null;
  }

  async createCandidateReaction(input: CreateCandidateReactionInput) {
    await wait(120);
    const reaction: CandidateReaction = {
      id: `cr-${crypto.randomUUID()}`,
      reactedAt: new Date().toISOString(),
      ...input,
    };
    mutableCandidateReactions.push(reaction);
    return reaction;
  }

  async getCandidateChallenges(candidateId: string) {
    await wait();
    const acceptedIds = new Set(
      mutableCandidateReactions
        .filter((reaction) => reaction.candidateId === candidateId && reaction.reaction === "accepted")
        .map((reaction) => reaction.opportunityId),
    );

    return mutableOpportunities
      .filter((opportunity) => acceptedIds.has(opportunity.id))
      .map((opportunity) => {
        const submission = mutableSubmissions.find(
          (item) => item.opportunityId === opportunity.id && item.candidate.id === candidateId,
        );
        const match = mutableMatches.find(
          (item) => item.opportunity.id === opportunity.id && item.candidate.id === candidateId,
        );
        return {
          ...opportunity,
          challengeStatus: match
            ? "matched"
            : submission?.status === "analysis_failed"
              ? "analysis_failed"
              : submission
                ? "submitted"
                : "in progress",
          submissionId: submission?.id,
        };
      });
  }

  async createSubmission(input: CreateSubmissionInput) {
    await wait(180);
    const candidate = candidates.find((item) => item.id === currentCandidateId) ?? candidates[0];
    const submission: Submission = {
      id: `sub-${crypto.randomUUID()}`,
      candidate,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      ...input,
    };
    mutableSubmissions.push(submission);
    return submission;
  }

  async retrySubmissionAnalysis(submissionId: string) {
    await wait(120);
    const submission = mutableSubmissions.find((item) => item.id === submissionId);
    if (!submission) throw new Error("Submission not found.");
    submission.status = "analysis_pending";
    submission.analysis = undefined;
    submission.analysisError = undefined;
    return submission;
  }

  async getEmployerOpportunities(employerId: string) {
    await wait();
    return mutableOpportunities.filter((opportunity) => opportunity.employer.id === employerId);
  }

  async createOpportunity(employerId: string, input: CreateOpportunityInput) {
    await wait(220);
    const employer = employers.find((item) => item.id === employerId) ?? employers[0];
    const opportunity: Opportunity = {
      id: `opp-${crypto.randomUUID()}`,
      employer,
      createdAt: new Date().toISOString(),
      ...input,
    };
    mutableOpportunities.unshift(opportunity);
    return opportunity;
  }

  async deleteOpportunity(id: string) {
    await wait(160);
    if (mutableSubmissions.some((submission) => submission.opportunityId === id)) {
      throw new Error("This opportunity already has candidate submissions and cannot be deleted.");
    }
    const index = mutableOpportunities.findIndex((opportunity) => opportunity.id === id);
    if (index >= 0) {
      mutableOpportunities.splice(index, 1);
    }
    for (let index = mutableCandidateReactions.length - 1; index >= 0; index -= 1) {
      if (mutableCandidateReactions[index].opportunityId === id) {
        mutableCandidateReactions.splice(index, 1);
      }
    }
  }

  async getOpportunityAnalytics(opportunityId: string) {
    await wait();
    return analytics.find((item) => item.opportunityId === opportunityId) ?? null;
  }

  async getOpportunitySubmissions(opportunityId: string) {
    await wait();
    return mutableSubmissions.filter((submission) => submission.opportunityId === opportunityId);
  }

  async getSubmission(id: string) {
    await wait();
    return mutableSubmissions.find((submission) => submission.id === id) ?? null;
  }

  async createEmployerReaction(input: CreateEmployerReactionInput) {
    await wait(140);
    const reaction: EmployerReaction = {
      id: `er-${crypto.randomUUID()}`,
      reactedAt: new Date().toISOString(),
      ...input,
    };
    const submission = mutableSubmissions.find((item) => item.id === input.submissionId);
    const opportunity = submission
      ? mutableOpportunities.find((item) => item.id === submission.opportunityId)
      : null;
    const candidateAccepted = submission
      ? mutableCandidateReactions.some(
          (item) =>
            item.candidateId === submission.candidate.id &&
            item.opportunityId === submission.opportunityId &&
            item.reaction === "accepted",
        )
      : false;

    let match: Match | null = null;
    if (input.reaction === "accepted" && submission && opportunity && candidateAccepted) {
      match = {
        id: `match-${crypto.randomUUID()}`,
        opportunity,
        candidate: submission.candidate,
        submissionId: submission.id,
        createdAt: new Date().toISOString(),
        status: "matched",
      };
      mutableMatches.unshift(match);
    }

    return { reaction, match };
  }

  async getMatches() {
    await wait();
    return mutableMatches;
  }

  async requestInterview(matchId: string) {
    await wait(160);
    const match = mutableMatches.find((item) => item.id === matchId);
    if (!match) {
      throw new Error("Match not found");
    }
    match.status = "interview_requested";
    return match;
  }
}
