import { LandingHero } from "@/features/landing/components/landing-hero";
import type { Opportunity } from "@/domain/types";
import { hiringService } from "@/lib/api/hiring-service";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let opportunities: Opportunity[] = [];
  try {
    opportunities = await hiringService.getOpportunitiesFeed();
  } catch (error) {
    console.error("[ReelHire landing] Opportunity preview unavailable", { error });
  }

  return <LandingHero opportunities={opportunities} />;
}
