"use client";

import { useQuery } from "@tanstack/react-query";
import { hiringService } from "@/lib/api/hiring-service";

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: () => hiringService.getMatches(),
  });
}
