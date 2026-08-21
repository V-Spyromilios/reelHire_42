import { z } from "zod";
import type {
  CandidateReaction,
  EmployerReaction,
  Match,
  Opportunity,
  OpportunityAnalytics,
  Submission,
} from "@/domain/types";
import { ApiError, apiRequest } from "@/lib/api/client";
import type {
  CreateCandidateReactionInput,
  CreateEmployerReactionInput,
  CreateOpportunityInput,
  CreateSubmissionInput,
  HiringRepository,
} from "@/repositories/contracts";
import {
  apiCandidateReactionSchema,
  apiEmployerSubmissionReactionResponseSchema,
  apiMatchListSchema,
  apiMatchSchema,
  apiOpportunityAnalyticsSchema,
  apiOpportunityListSchema,
  apiOpportunitySchema,
  apiSubmissionListSchema,
  apiSubmissionSchema,
  mapApiMediaAsset,
  type ApiMatch,
  type ApiOpportunity,
  type ApiSubmission,
} from "./api-schemas";

function mapOpportunity(item: ApiOpportunity): Opportunity {
  const pitchVideo = mapApiMediaAsset(item.pitch_video);
  return {
    id: item.id,
    employer: item.employer,
    roleTitle: item.role_title,
    shortDescription: item.short_description,
    videoUrl: pitchVideo?.secureUrl ?? item.pitch_video_secure_url ?? "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
    pitchVideo,
    challengeTitle: item.challenge_title,
    challengeDescription: item.challenge_description,
    skills: item.skills,
    location: item.location,
    workMode: item.work_mode,
    expectedChallengeDuration: item.expected_challenge_duration,
    deadline: item.deadline ?? undefined,
    createdAt: item.created_at,
    status: item.status,
  };
}

function mapSubmission(item: ApiSubmission): Submission {
  const explanationVideo = mapApiMediaAsset(item.explanation_video);
  return {
    id: item.id,
    candidate: item.candidate,
    opportunityId: item.opportunity_id,
    githubUrl: item.github_url,
    explanationVideoUrl: explanationVideo?.secureUrl ?? item.explanation_video_secure_url ?? "https://videos.pexels.com/video-files/3209298/3209298-uhd_2560_1440_25fps.mp4",
    explanationVideo,
    submittedAt: item.created_at,
    status: item.status,
    employerReaction: item.employer_reaction ?? undefined,
    matchId: item.match_id ?? undefined,
    matchStatus: item.match_status ?? undefined,
  };
}

function mapMatch(item: ApiMatch): Match {
  return {
    id: item.id,
    opportunity: mapOpportunity(item.opportunity),
    candidate: item.candidate,
    submissionId: item.submissionId,
    createdAt: item.createdAt,
    status: item.status,
  };
}

export class ApiHiringRepository implements HiringRepository {
  async getOpportunitiesFeed() {
    const items = await apiRequest("/api/opportunities/feed", apiOpportunityListSchema);
    return items.map(mapOpportunity);
  }

  async getOpportunity(id: string) {
    try {
      const item = await apiRequest(`/api/opportunities/${id}`, apiOpportunitySchema);
      return mapOpportunity(item);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async createCandidateReaction(input: CreateCandidateReactionInput): Promise<CandidateReaction> {
    return apiRequest(`/api/opportunities/${input.opportunityId}/reactions`, apiCandidateReactionSchema, {
      method: "POST",
      body: JSON.stringify({
        reaction: input.reaction,
        watch_time_ms: input.watchTimeMs,
        video_duration_ms: input.videoDurationMs,
        reacted_at: new Date().toISOString(),
      }),
    });
  }

  async removeCandidateReaction(opportunityId: string) {
    await apiRequest(`/api/opportunities/${opportunityId}/reactions`, z.undefined(), {
      method: "DELETE",
    });
  }

  async getCandidateChallenges() {
    const items = await apiRequest("/api/candidate/challenges", z.array(apiOpportunitySchema.extend({ challenge_status: z.string() })));
    return items.map((item) => ({
      ...mapOpportunity(item),
      challengeStatus: item.challenge_status,
    }));
  }

  async createSubmission(input: CreateSubmissionInput) {
    const item = await apiRequest("/api/submissions", apiSubmissionSchema, {
      method: "POST",
      body: JSON.stringify({
        opportunity_id: input.opportunityId,
        github_url: input.githubUrl,
        explanation_video: input.explanationVideo
          ? {
              public_id: input.explanationVideo.publicId,
              secure_url: input.explanationVideo.secureUrl,
              resource_type: input.explanationVideo.resourceType,
              format: input.explanationVideo.format,
              bytes: input.explanationVideo.bytes,
              width: input.explanationVideo.width,
              height: input.explanationVideo.height,
              duration_seconds: input.explanationVideo.durationSeconds,
              created_at: input.explanationVideo.createdAt,
            }
          : undefined,
      }),
    });
    return mapSubmission(item);
  }

  async getEmployerOpportunities() {
    const items = await apiRequest("/api/opportunities", apiOpportunityListSchema);
    return items.map(mapOpportunity);
  }

  async createOpportunity(_employerId: string, input: CreateOpportunityInput) {
    const item = await apiRequest("/api/opportunities", apiOpportunitySchema, {
      method: "POST",
      body: JSON.stringify({
        role_title: input.roleTitle,
        short_description: input.shortDescription,
        challenge_title: input.challengeTitle,
        challenge_description: input.challengeDescription,
        skills: input.skills,
        location: input.location,
        work_mode: input.workMode,
        expected_challenge_duration: input.expectedChallengeDuration,
        deadline: input.deadline,
        pitch_video: input.pitchVideo
          ? {
              public_id: input.pitchVideo.publicId,
              secure_url: input.pitchVideo.secureUrl,
              resource_type: input.pitchVideo.resourceType,
              format: input.pitchVideo.format,
              bytes: input.pitchVideo.bytes,
              width: input.pitchVideo.width,
              height: input.pitchVideo.height,
              duration_seconds: input.pitchVideo.durationSeconds,
              created_at: input.pitchVideo.createdAt,
            }
          : undefined,
      }),
    });
    return mapOpportunity(item);
  }

  async deleteOpportunity(id: string): Promise<void> {
    await apiRequest(`/api/opportunities/${id}`, z.void(), {
      method: "DELETE",
    });
  }

  async getOpportunityAnalytics(opportunityId: string) {
    try {
      return await apiRequest(`/api/employer/opportunities/${opportunityId}/analytics`, apiOpportunityAnalyticsSchema);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getOpportunitySubmissions(opportunityId: string) {
    const items = await apiRequest(`/api/employer/opportunities/${opportunityId}/submissions`, apiSubmissionListSchema);
    return items.map(mapSubmission);
  }

  async getSubmission(id: string) {
    try {
      const item = await apiRequest(`/api/employer/submissions/${id}`, apiSubmissionSchema);
      return mapSubmission(item);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async createEmployerReaction(input: CreateEmployerReactionInput): Promise<{ reaction: EmployerReaction; match: Match | null }> {
    const response = await apiRequest(
      `/api/employer/submissions/${input.submissionId}/reaction`,
      apiEmployerSubmissionReactionResponseSchema,
      {
        method: "POST",
        body: JSON.stringify({ reaction: input.reaction }),
      },
    );
    return {
      reaction: response.reaction,
      match: response.match ? mapMatch(response.match) : null,
    };
  }

  async getEmployerMatches(): Promise<Match[]> {
    const items = await apiRequest("/api/employer/matches", apiMatchListSchema);
    return items.map(mapMatch);
  }

  async getCandidateMatches(): Promise<Match[]> {
    const items = await apiRequest("/api/candidate/matches", apiMatchListSchema);
    return items.map(mapMatch);
  }

  async requestInterview(matchId: string): Promise<Match> {
    const item = await apiRequest(`/api/matches/${matchId}/interview`, apiMatchSchema, {
      method: "POST",
    });
    return mapMatch(item);
  }
}
