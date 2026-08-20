from pydantic import BaseModel, Field


class DecisionTimeBucketResponse(BaseModel):
    label: str
    seconds: float = Field(ge=0)
    accepted: int = Field(ge=0)
    passed: int = Field(ge=0)
    saved: int = Field(ge=0)


class OpportunityAnalyticsResponse(BaseModel):
    opportunityId: str
    impressions: int = Field(ge=0)
    uniqueViews: int = Field(ge=0)
    acceptedCount: int = Field(ge=0)
    passedCount: int = Field(ge=0)
    savedCount: int = Field(ge=0)
    submissionsCount: int = Field(ge=0)
    acceptanceRate: float = Field(ge=0, le=1)
    averageDecisionTimeMs: int = Field(ge=0)
    medianDecisionTimeMs: int = Field(ge=0)
    averageWatchTimeMs: int = Field(ge=0)
    completionRate: float = Field(ge=0, le=1)
    decisionTimeDistribution: list[DecisionTimeBucketResponse]
    insight: str
