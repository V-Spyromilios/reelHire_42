import { z } from "zod";
import { candidateSchema } from "@/domain/schemas/candidate";
import { employerSchema } from "@/domain/schemas/employer";
import { mediaAssetSchema } from "@/domain/schemas/media";
import { candidateReactionSchema } from "@/domain/schemas/reactions";
import { opportunityAnalyticsSchema } from "@/domain/schemas/analytics";

const apiMediaAssetSchema = z.object({
  public_id: z.string(),
  secure_url: z.string().url(),
  resource_type: z.literal("video"),
  format: z.string(),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration_seconds: z.number().positive().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const apiOpportunitySchema = z.object({
  id: z.string(),
  employer: employerSchema,
  employer_id: z.string(),
  company_name: z.string(),
  role_title: z.string(),
  short_description: z.string(),
  challenge_title: z.string(),
  challenge_description: z.string(),
  skills: z.array(z.string()),
  location: z.string(),
  work_mode: z.enum(["remote", "hybrid", "onsite"]),
  expected_challenge_duration: z.string(),
  deadline: z.string().nullable().optional(),
  created_at: z.string(),
  status: z.enum(["draft", "published", "closed"]),
  pitch_video: apiMediaAssetSchema.nullable().optional(),
  pitch_video_secure_url: z.string().url().nullable().optional(),
});

export const apiSubmissionSchema = z.object({
  id: z.string(),
  candidate: candidateSchema,
  candidate_id: z.string(),
  opportunity_id: z.string(),
  github_url: z.string().url(),
  explanation_video: apiMediaAssetSchema.nullable().optional(),
  explanation_video_secure_url: z.string().url().nullable().optional(),
  status: z.enum(["draft", "submitted", "analysis_pending", "analysis_complete", "matched", "closed"]),
  created_at: z.string(),
  updated_at: z.string(),
  employer_reaction: z
    .object({
      id: z.string(),
      employerId: z.string(),
      submissionId: z.string(),
      reaction: z.enum(["accepted", "passed"]),
      reactedAt: z.string(),
      updatedAt: z.string(),
    })
    .nullable()
    .optional(),
  match_id: z.string().nullable().optional(),
  match_status: z.enum(["matched", "interview_requested", "interview_scheduled", "closed"]).nullable().optional(),
});

export const apiOpportunityListSchema = z.array(apiOpportunitySchema);
export const apiSubmissionListSchema = z.array(apiSubmissionSchema);
export const apiCandidateReactionSchema = candidateReactionSchema;
export const apiOpportunityAnalyticsSchema = opportunityAnalyticsSchema;

export const apiMatchSchema = z.object({
  id: z.string(),
  opportunity: apiOpportunitySchema,
  candidate: candidateSchema,
  submissionId: z.string(),
  createdAt: z.string(),
  status: z.enum(["matched", "interview_requested", "interview_scheduled", "closed"]),
});

export const apiEmployerReactionSchema = z.object({
  id: z.string(),
  employerId: z.string(),
  submissionId: z.string(),
  reaction: z.enum(["accepted", "passed"]),
  reactedAt: z.string(),
  updatedAt: z.string(),
});

export const apiEmployerSubmissionReactionResponseSchema = z.object({
  reaction: apiEmployerReactionSchema,
  match: apiMatchSchema.nullable(),
});

export const apiMatchListSchema = z.array(apiMatchSchema);

export function mapApiMediaAsset(asset: z.infer<typeof apiMediaAssetSchema> | null | undefined) {
  if (!asset) return undefined;
  return mediaAssetSchema.parse({
    publicId: asset.public_id,
    secureUrl: asset.secure_url,
    resourceType: asset.resource_type,
    format: asset.format,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    durationSeconds: asset.duration_seconds,
    createdAt: asset.created_at ?? undefined,
  });
}

export type ApiOpportunity = z.infer<typeof apiOpportunitySchema>;
export type ApiSubmission = z.infer<typeof apiSubmissionSchema>;
export type ApiMatch = z.infer<typeof apiMatchSchema>;
export type ApiMediaAsset = z.infer<typeof apiMediaAssetSchema>;
