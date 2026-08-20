import type {
  CandidateReaction,
  CandidateReactionKind,
  EmployerReaction,
  EmployerReactionKind,
  Match,
  Opportunity,
  OpportunityAnalytics,
  Submission,
  MediaAsset,
} from "@/domain/types";

export type CreateOpportunityInput = {
  roleTitle: string;
  shortDescription: string;
  videoUrl: string;
  pitchVideo?: MediaAsset;
  challengeTitle: string;
  challengeDescription: string;
  skills: string[];
  location: string;
  workMode: Opportunity["workMode"];
  expectedChallengeDuration: string;
  deadline?: string;
};

export type CreateSubmissionInput = {
  opportunityId: string;
  githubUrl: string;
  explanationVideoUrl: string;
  explanationVideo?: MediaAsset;
};

export type CreateCandidateReactionInput = {
  candidateId: string;
  opportunityId: string;
  reaction: CandidateReactionKind;
  watchTimeMs: number;
  videoDurationMs: number;
};

export type CreateEmployerReactionInput = {
  employerId: string;
  submissionId: string;
  reaction: EmployerReactionKind;
};

export interface HiringRepository {
  getOpportunitiesFeed(): Promise<Opportunity[]>;
  getOpportunity(id: string): Promise<Opportunity | null>;
  createCandidateReaction(input: CreateCandidateReactionInput): Promise<CandidateReaction>;
  getCandidateChallenges(candidateId: string): Promise<Array<Opportunity & { challengeStatus: string; submissionId?: string }>>;
  createSubmission(input: CreateSubmissionInput): Promise<Submission>;
  retrySubmissionAnalysis(submissionId: string): Promise<Submission>;
  getEmployerOpportunities(employerId: string): Promise<Opportunity[]>;
  createOpportunity(employerId: string, input: CreateOpportunityInput): Promise<Opportunity>;
  deleteOpportunity(id: string): Promise<void>;
  getOpportunityAnalytics(opportunityId: string): Promise<OpportunityAnalytics | null>;
  getOpportunitySubmissions(opportunityId: string): Promise<Submission[]>;
  getSubmission(id: string): Promise<Submission | null>;
  createEmployerReaction(input: CreateEmployerReactionInput): Promise<{ reaction: EmployerReaction; match: Match | null }>;
  getMatches(): Promise<Match[]>;
  requestInterview(matchId: string): Promise<Match>;
}
