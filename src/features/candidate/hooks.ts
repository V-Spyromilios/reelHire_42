"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hiringService } from "@/lib/api/hiring-service";
import type { CreateSubmissionInput } from "@/repositories/contracts";
import { opportunityKeys } from "@/features/opportunities/hooks";

export function useCandidateChallenges() {
  return useQuery({
    queryKey: ["candidate", "challenges"],
    queryFn: () => hiringService.getCandidateChallenges(),
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubmissionInput) => hiringService.createSubmission(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["candidate", "challenges"] });
      void queryClient.invalidateQueries({ queryKey: ["employer", "opportunities"] });
    },
  });
}

export function useRemoveCandidateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opportunityId: string) => hiringService.removeCandidateReaction(opportunityId),
    onSuccess: (_data, opportunityId) => {
      void queryClient.invalidateQueries({ queryKey: ["candidate", "challenges"] });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.feed });
      void queryClient.invalidateQueries({ queryKey: opportunityKeys.detail(opportunityId) });
    },
  });
}
