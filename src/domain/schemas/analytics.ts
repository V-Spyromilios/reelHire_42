import { z } from "zod";

export const decisionTimeBucketSchema = z.object({
  label: z.string(),
  seconds: z.number().nonnegative(),
  accepted: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  saved: z.number().int().nonnegative(),
});

export const opportunityAnalyticsSchema = z.object({
  opportunityId: z.string(),
  impressions: z.number().int().nonnegative(),
  uniqueViews: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  savedCount: z.number().int().nonnegative(),
  submissionsCount: z.number().int().nonnegative(),
  acceptanceRate: z.number().min(0).max(1),
  averageDecisionTimeMs: z.number().int().nonnegative(),
  medianDecisionTimeMs: z.number().int().nonnegative(),
  averageWatchTimeMs: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(1),
  decisionTimeDistribution: z.array(decisionTimeBucketSchema),
  insight: z.string(),
});

export type DecisionTimeBucket = z.infer<typeof decisionTimeBucketSchema>;
export type OpportunityAnalytics = z.infer<typeof opportunityAnalyticsSchema>;
