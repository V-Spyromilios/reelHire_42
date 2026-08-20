"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hiringService } from "@/lib/api/hiring-service";
import type { CreateSubmissionInput } from "@/repositories/contracts";

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
