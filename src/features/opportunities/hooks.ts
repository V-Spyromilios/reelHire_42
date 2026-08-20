"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CandidateReactionKind } from "@/domain/types";
import { hiringService } from "@/lib/api/hiring-service";

export const opportunityKeys = {
  feed: ["opportunities", "feed"] as const,
  detail: (id: string) => ["opportunities", id] as const,
};

export function useOpportunitiesFeed() {
  return useQuery({
    queryKey: opportunityKeys.feed,
    queryFn: () => hiringService.getOpportunitiesFeed(),
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: opportunityKeys.detail(id),
    queryFn: () => hiringService.getOpportunity(id),
  });
}

export function useOpportunityReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      opportunityId,
      reaction,
      watchTimeMs,
      videoDurationMs,
    }: {
      opportunityId: string;
      reaction: CandidateReactionKind;
      watchTimeMs?: number;
      videoDurationMs?: number;
    }) => hiringService.reactToOpportunity(opportunityId, reaction, watchTimeMs, videoDurationMs),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.feed });
      void queryClient.invalidateQueries({ queryKey: ["candidate", "challenges"] });
    },
  });
}
