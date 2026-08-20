import { z } from "zod";

export const candidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().url(),
  headline: z.string(),
  location: z.string(),
  skills: z.array(z.string()),
  githubUsername: z.string().optional(),
});

export type Candidate = z.infer<typeof candidateSchema>;
