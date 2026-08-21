import type {
  CandidateReaction,
  EmployerReaction,
  Match,
  Opportunity,
  ProjectAnalysis,
  ProjectEvaluation,
  Submission,
} from "@/domain/types";
import {
  analytics,
  candidateReactions,
  candidates,
  currentCandidateId,
  currentEmployerId,
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

type MutableCandidateReaction = CandidateReaction & { withdrawnAt?: string | null };

const mutableCandidateReactions: MutableCandidateReaction[] = [...candidateReactions];
const mutableSubmissions: Submission[] = [...submissions];
const mutableMatches: Match[] = [...matches];
const mutableOpportunities: Opportunity[] = [...opportunities];
const mutableEmployerReactions: EmployerReaction[] = [];

function evaluationFromAnalysis(submission: Submission, analysis?: ProjectAnalysis): ProjectEvaluation {
  const source = analysis ?? {
    overallScore: 76,
    codeQuality: 78,
    architecture: 74,
    testing: 58,
    documentation: 81,
    summary: "The repository addresses the challenge with a readable implementation and clear notes. Automated test evidence is limited in the inspected files.",
    strengths: ["Readable structure", "Challenge intent is documented"],
    concerns: ["Test coverage is light"],
    evidence: [
      {
        label: "Documentation",
        file: "README.md",
        lines: "1-42",
        note: "README describes the implementation scope and trade-offs.",
      },
    ],
  };

  return {
    id: `pe-${submission.id}`,
    submissionId: submission.id,
    overallScore: source.overallScore,
    challengeCompletion: source.overallScore ?? source.codeQuality,
    codeQuality: source.codeQuality,
    architecture: source.architecture,
    testing: source.testing,
    documentation: source.documentation,
    summary: source.summary,
    strengths: source.strengths,
    concerns: source.concerns,
    evidence: source.evidence.map((item) => ({
      category: item.label,
      filePath: item.file,
      observation: item.note,
    })),
    status: "completed",
    createdAt: submission.submittedAt,
    updatedAt: new Date().toISOString(),
  };
}

export class MockHiringRepository implements HiringRepository {
  async getOpportunitiesFeed() {
    await wait();
    const activeAcceptedIds = new Set(
      mutableCandidateReactions
        .filter(
          (reaction) =>
            reaction.candidateId === currentCandidateId && reaction.reaction === "accepted" && !reaction.withdrawnAt,
        )
        .map((reaction) => reaction.opportunityId),
    );
    return mutableOpportunities.filter((opportunity) => !activeAcceptedIds.has(opportunity.id));
  }

  async getOpportunity(id: string) {
    await wait();
    return mutableOpportunities.find((opportunity) => opportunity.id === id) ?? null;
  }

  async createCandidateReaction(input: CreateCandidateReactionInput) {
    await wait(120);
    const existing = mutableCandidateReactions.find(
      (reaction) => reaction.candidateId === input.candidateId && reaction.opportunityId === input.opportunityId,
    );
    if (existing) {
      existing.reaction = input.reaction;
      existing.watchTimeMs = input.watchTimeMs;
      existing.videoDurationMs = input.videoDurationMs;
      existing.reactedAt = new Date().toISOString();
      existing.withdrawnAt = null;
      return existing;
    }

    const reaction: CandidateReaction = {
      id: `cr-${crypto.randomUUID()}`,
      reactedAt: new Date().toISOString(),
      ...input,
    };
    mutableCandidateReactions.push(reaction);
    return reaction;
  }

  async removeCandidateReaction(opportunityId: string) {
    await wait(120);
    const hasSubmission = mutableSubmissions.some(
      (submission) => submission.candidate.id === currentCandidateId && submission.opportunityId === opportunityId,
    );
    if (hasSubmission) {
      throw new Error("This challenge already has a submitted project and cannot be removed.");
    }

    const existing = mutableCandidateReactions.find(
      (reaction) =>
        reaction.candidateId === currentCandidateId &&
        reaction.opportunityId === opportunityId &&
        reaction.reaction === "accepted" &&
        !reaction.withdrawnAt,
    );
    if (!existing) {
      throw new Error("Accepted challenge not found.");
    }
    existing.withdrawnAt = new Date().toISOString();
  }

  async getCandidateChallenges(candidateId: string) {
    await wait();
    const acceptedIds = new Set(
      mutableCandidateReactions
        .filter((reaction) => reaction.candidateId === candidateId && reaction.reaction === "accepted" && !reaction.withdrawnAt)
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
          challengeStatus: match ? "matched" : submission ? "submitted" : "in progress",
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

  async analyzeSubmission(id: string) {
    await wait(800);
    const submission = mutableSubmissions.find((item) => item.id === id);
    if (!submission) {
      throw new Error("Submission not found.");
    }
    const evaluation = evaluationFromAnalysis(submission, submission.analysis);
    submission.projectEvaluation = evaluation;
    return evaluation;
  }

  async createEmployerReaction(input: CreateEmployerReactionInput) {
    await wait(140);
    const submission = mutableSubmissions.find((item) => item.id === input.submissionId);
    const opportunity = submission
      ? mutableOpportunities.find((item) => item.id === submission.opportunityId)
      : null;
    const candidateAccepted = submission
      ? mutableCandidateReactions.some(
          (item) =>
            item.candidateId === submission.candidate.id &&
            item.opportunityId === submission.opportunityId &&
            item.reaction === "accepted" &&
            !item.withdrawnAt,
        )
      : false;
    const existingMatch = mutableMatches.find((item) => item.submissionId === input.submissionId) ?? null;
    if (existingMatch && input.reaction === "passed") {
      throw new Error("This submission has already been matched.");
    }

    const existingReaction = mutableEmployerReactions.find(
      (item) => item.employerId === input.employerId && item.submissionId === input.submissionId,
    );
    const reaction: EmployerReaction = existingReaction ?? {
      id: `er-${crypto.randomUUID()}`,
      reactedAt: new Date().toISOString(),
      ...input,
    };
    reaction.reaction = input.reaction;
    reaction.updatedAt = new Date().toISOString();
    if (!existingReaction) mutableEmployerReactions.push(reaction);

    let match: Match | null = existingMatch;
    if (input.reaction === "accepted" && submission && opportunity && candidateAccepted && !match) {
      match = {
        id: `match-${crypto.randomUUID()}`,
        opportunity,
        candidate: submission.candidate,
        submissionId: submission.id,
        createdAt: new Date().toISOString(),
        status: "matched",
      };
      submission.status = "matched";
      mutableMatches.unshift(match);
    }

    return { reaction, match };
  }

  async getEmployerMatches() {
    await wait();
    return mutableMatches.filter((match) => match.opportunity.employer.id === currentEmployerId);
  }

  async getCandidateMatches() {
    await wait();
    return mutableMatches.filter((match) => match.candidate.id === currentCandidateId);
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
