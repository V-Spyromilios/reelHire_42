import { z } from "zod";

export const candidateReactionSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  opportunityId: z.string(),
  reaction: z.enum(["accepted", "passed", "saved"]),
  watchTimeMs: z.number().int().nonnegative(),
  videoDurationMs: z.number().int().positive(),
  reactedAt: z.string().datetime(),
});

export const employerReactionSchema = z.object({
  id: z.string(),
  employerId: z.string(),
  submissionId: z.string(),
  reaction: z.enum(["accepted", "passed"]),
  reactedAt: z.string().datetime(),
});

export type CandidateReaction = z.infer<typeof candidateReactionSchema>;
export type CandidateReactionKind = CandidateReaction["reaction"];
export type EmployerReaction = z.infer<typeof employerReactionSchema>;
export type EmployerReactionKind = EmployerReaction["reaction"];
