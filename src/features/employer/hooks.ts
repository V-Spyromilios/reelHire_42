"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Opportunity } from "@/domain/types";
import type { CreateOpportunityInput } from "@/repositories/contracts";
import { hiringService } from "@/lib/api/hiring-service";

export function useEmployerOpportunities(initialData?: Opportunity[]) {
  return useQuery({
    queryKey: ["employer", "opportunities"],
    queryFn: () => hiringService.getEmployerOpportunities(),
    initialData,
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hiringService.deleteOpportunity(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer", "opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities", "feed"] });
      void queryClient.invalidateQueries({ queryKey: ["candidate", "challenges"] });
    },
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpportunityInput) => hiringService.createOpportunity(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer", "opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities", "feed"] });
    },
  });
}

export function useOpportunityAnalytics(opportunityId: string) {
  return useQuery({
    queryKey: ["employer", "opportunities", opportunityId, "analytics"],
    queryFn: () => hiringService.getOpportunityAnalytics(opportunityId),
  });
}
