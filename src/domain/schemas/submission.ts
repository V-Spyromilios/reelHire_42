import { z } from "zod";
import { candidateSchema } from "./candidate";
import { mediaAssetSchema } from "./media";

export const projectEvidenceSchema = z.object({
  label: z.string(),
  file: z.string(),
  lines: z.string(),
  note: z.string(),
});

export const projectAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  codeQuality: z.number().min(0).max(100),
  architecture: z.number().min(0).max(100),
  testing: z.number().min(0).max(100),
  documentation: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  evidence: z.array(projectEvidenceSchema),
});

export const submissionSchema = z.object({
  id: z.string(),
  candidate: candidateSchema,
  opportunityId: z.string(),
  githubUrl: z.string().url(),
  explanationVideoUrl: z.string().url(),
  explanationVideo: mediaAssetSchema.optional(),
  submittedAt: z.string().datetime(),
  status: z.enum(["draft", "submitted", "analysis_pending", "analysis_complete", "analysis_failed", "reviewed", "matched", "passed", "closed"]),
  analysis: projectAnalysisSchema.optional(),
  analysisError: z.string().optional(),
  analysisModel: z.string().optional(),
  analysisCommitSha: z.string().optional(),
  analysisEvaluatedAt: z.string().datetime().optional(),
});

export type ProjectEvidence = z.infer<typeof projectEvidenceSchema>;
export type ProjectAnalysis = z.infer<typeof projectAnalysisSchema>;
export type Submission = z.infer<typeof submissionSchema>;
