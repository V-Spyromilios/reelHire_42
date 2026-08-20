from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.dependencies.identity import CandidateIdentity, EmployerIdentity, get_current_candidate, get_current_employer
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.analytics import OpportunityAnalyticsResponse
from app.schemas.opportunity import CreateOpportunityRequest, OpportunityResponse
from app.schemas.reaction import CandidateReactionRequest, CandidateReactionResponse
from app.services.cloudinary_service import CloudinaryService
from app.services.opportunity_service import OpportunityService

router = APIRouter(prefix="/api", tags=["opportunities"])


def opportunity_service(
    session: AsyncSession = Depends(get_session),
    employer: EmployerIdentity = Depends(get_current_employer),
    settings: Settings = Depends(get_settings),
) -> OpportunityService:
    return OpportunityService(
        OpportunityRepository(session),
        SubmissionRepository(session),
        employer,
        CloudinaryService(settings),
    )


@router.get("/opportunities", response_model=list[OpportunityResponse])
async def list_opportunities(service: OpportunityService = Depends(opportunity_service)) -> list[OpportunityResponse]:
    return await service.list_employer()


@router.post("/opportunities", response_model=OpportunityResponse, status_code=201)
async def create_opportunity(
    payload: CreateOpportunityRequest,
    session: AsyncSession = Depends(get_session),
    service: OpportunityService = Depends(opportunity_service),
) -> OpportunityResponse:
    response = await service.create(payload)
    await session.commit()
    return response


@router.get("/opportunities/feed", response_model=list[OpportunityResponse])
async def opportunities_feed(
    candidate: CandidateIdentity = Depends(get_current_candidate),
    service: OpportunityService = Depends(opportunity_service),
) -> list[OpportunityResponse]:
    return await service.list_feed(candidate)


@router.get("/opportunities/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(opportunity_id: str, service: OpportunityService = Depends(opportunity_service)) -> OpportunityResponse:
    return await service.get(opportunity_id)


@router.get("/employer/opportunities/{opportunity_id}/analytics", response_model=OpportunityAnalyticsResponse)
async def opportunity_analytics(
    opportunity_id: str,
    service: OpportunityService = Depends(opportunity_service),
) -> OpportunityAnalyticsResponse:
    return await service.analytics(opportunity_id)


@router.delete("/opportunities/{opportunity_id}", status_code=204)
async def delete_opportunity(
    opportunity_id: str,
    session: AsyncSession = Depends(get_session),
    service: OpportunityService = Depends(opportunity_service),
) -> Response:
    await service.delete(opportunity_id)
    await session.commit()
    return Response(status_code=204)


@router.post("/opportunities/{opportunity_id}/reactions", response_model=CandidateReactionResponse)
async def react_to_opportunity(
    opportunity_id: str,
    payload: CandidateReactionRequest,
    session: AsyncSession = Depends(get_session),
    candidate: CandidateIdentity = Depends(get_current_candidate),
    service: OpportunityService = Depends(opportunity_service),
) -> CandidateReactionResponse:
    response = await service.react(opportunity_id, candidate, payload)
    await session.commit()
    return response


@router.delete("/opportunities/{opportunity_id}/reactions", status_code=204)
async def remove_opportunity_reaction(
    opportunity_id: str,
    session: AsyncSession = Depends(get_session),
    candidate: CandidateIdentity = Depends(get_current_candidate),
    service: OpportunityService = Depends(opportunity_service),
) -> Response:
    await service.remove_candidate_reaction(opportunity_id, candidate)
    await session.commit()
    return Response(status_code=204)


@router.get("/candidate/challenges")
async def candidate_challenges(
    candidate: CandidateIdentity = Depends(get_current_candidate),
    service: OpportunityService = Depends(opportunity_service),
) -> list[dict]:
    return await service.candidate_challenges(candidate)
