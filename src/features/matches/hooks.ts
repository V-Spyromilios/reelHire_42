"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmployerReactionKind } from "@/domain/types";
import { hiringService } from "@/lib/api/hiring-service";

export const matchKeys = {
  employer: ["matches", "employer"] as const,
  candidate: ["matches", "candidate"] as const,
};

export function useEmployerMatches() {
  return useQuery({
    queryKey: matchKeys.employer,
    queryFn: () => hiringService.getEmployerMatches(),
  });
}

export function useCandidateMatches() {
  return useQuery({
    queryKey: matchKeys.candidate,
    queryFn: () => hiringService.getCandidateMatches(),
  });
}

export function useMatches() {
  return useEmployerMatches();
}

export function useEmployerSubmissionReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, reaction }: { submissionId: string; reaction: EmployerReactionKind }) =>
      hiringService.reactToSubmission(submissionId, reaction),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["employer"] });
      void queryClient.invalidateQueries({ queryKey: ["employer", "submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["employer", "submissions", variables.submissionId] });
      void queryClient.invalidateQueries({ queryKey: matchKeys.employer });
      void queryClient.invalidateQueries({ queryKey: matchKeys.candidate });
      void queryClient.invalidateQueries({ queryKey: ["candidate", "challenges"] });
    },
  });
}

export function useAnalyzeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, force = false }: { submissionId: string; force?: boolean }) =>
      hiringService.analyzeSubmission(submissionId, force),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["employer", "submissions", variables.submissionId] });
      void queryClient.invalidateQueries({ queryKey: ["employer", "submissions"] });
      void queryClient.invalidateQueries({ queryKey: matchKeys.employer });
    },
  });
}

export function useRequestInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => hiringService.requestInterview(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.employer });
      void queryClient.invalidateQueries({ queryKey: matchKeys.candidate });
      void queryClient.invalidateQueries({ queryKey: ["employer"] });
    },
  });
}
