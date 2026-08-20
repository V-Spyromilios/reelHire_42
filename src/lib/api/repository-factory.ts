import { ApiHiringRepository } from "@/repositories/api/api-hiring-repository";
import { MockHiringRepository } from "@/repositories/mock/mock-hiring-repository";
import type { HiringRepository } from "@/repositories/contracts";

export type DataSource = "mock" | "api";

export function getDataSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock";
}

export function createHiringRepository(): HiringRepository {
  return getDataSource() === "api" ? new ApiHiringRepository() : new MockHiringRepository();
}
