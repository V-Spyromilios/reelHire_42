import { z } from "zod";
import { candidateSchema } from "./candidate";
import { opportunitySchema } from "./opportunity";

export const matchSchema = z.object({
  id: z.string(),
  opportunity: opportunitySchema,
  candidate: candidateSchema,
  submissionId: z.string(),
  createdAt: z.string().datetime(),
  status: z.enum(["matched", "interview_requested", "interview_scheduled", "closed"]),
});

export type Match = z.infer<typeof matchSchema>;
