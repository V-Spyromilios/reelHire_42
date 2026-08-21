import { z } from "zod";
import { candidateSchema } from "./candidate";
import { mediaAssetSchema } from "./media";
import { employerReactionSchema } from "./reactions";

export const projectEvidenceSchema = z.object({
  label: z.string(),
  file: z.string(),
  lines: z.string(),
  note: z.string(),
});

export const projectAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100).optional(),
  codeQuality: z.number().min(0).max(100),
  architecture: z.number().min(0).max(100),
  testing: z.number().min(0).max(100),
  documentation: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  evidence: z.array(projectEvidenceSchema),
});

export const projectEvaluationEvidenceSchema = z.object({
  category: z.string(),
  filePath: z.string().nullable().optional(),
  observation: z.string(),
});

export const projectEvaluationSchema = z.object({
  id: z.string(),
  submissionId: z.string(),
  overallScore: z.number().min(0).max(100).nullable().optional(),
  challengeCompletion: z.number().min(0).max(100),
  codeQuality: z.number().min(0).max(100),
  architecture: z.number().min(0).max(100),
  testing: z.number().min(0).max(100),
  documentation: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  evidence: z.array(projectEvaluationEvidenceSchema),
  status: z.enum(["pending", "completed", "failed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const submissionSchema = z.object({
  id: z.string(),
  candidate: candidateSchema,
  opportunityId: z.string(),
  githubUrl: z.string().url(),
  explanationVideoUrl: z.string().url(),
  explanationVideo: mediaAssetSchema.optional(),
  submittedAt: z.string().datetime(),
  status: z.enum(["draft", "submitted", "analysis_pending", "analysis_complete", "reviewed", "matched", "passed", "closed"]),
  analysis: projectAnalysisSchema.optional(),
  projectEvaluation: projectEvaluationSchema.optional(),
  employerReaction: employerReactionSchema.optional(),
  matchId: z.string().optional(),
  matchStatus: z.enum(["matched", "interview_requested", "interview_scheduled", "closed"]).optional(),
});

export type ProjectEvidence = z.infer<typeof projectEvidenceSchema>;
export type ProjectAnalysis = z.infer<typeof projectAnalysisSchema>;
export type ProjectEvaluationEvidence = z.infer<typeof projectEvaluationEvidenceSchema>;
export type ProjectEvaluation = z.infer<typeof projectEvaluationSchema>;
export type Submission = z.infer<typeof submissionSchema>;
