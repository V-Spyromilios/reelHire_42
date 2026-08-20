import { z } from "zod";
import { employerSchema } from "./employer";
import { mediaAssetSchema } from "./media";

export const workModeSchema = z.enum(["remote", "hybrid", "onsite"]);

export const opportunitySchema = z.object({
  id: z.string(),
  employer: employerSchema,
  roleTitle: z.string(),
  shortDescription: z.string(),
  videoUrl: z.string().url(),
  pitchVideo: mediaAssetSchema.optional(),
  challengeTitle: z.string(),
  challengeDescription: z.string(),
  skills: z.array(z.string()),
  location: z.string(),
  workMode: workModeSchema,
  expectedChallengeDuration: z.string(),
  deadline: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  status: z.enum(["draft", "published", "closed"]).optional(),
});

export type WorkMode = z.infer<typeof workModeSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
