from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.dependencies.identity import CandidateIdentity, get_current_candidate
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.submission import CreateSubmissionRequest, SubmissionResponse
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/api", tags=["submissions"])


def submission_service(
    session: AsyncSession = Depends(get_session),
    candidate: CandidateIdentity = Depends(get_current_candidate),
) -> SubmissionService:
    return SubmissionService(SubmissionRepository(session), OpportunityRepository(session), candidate)


@router.post("/submissions", response_model=SubmissionResponse, status_code=201)
async def create_submission(
    payload: CreateSubmissionRequest,
    session: AsyncSession = Depends(get_session),
    service: SubmissionService = Depends(submission_service),
) -> SubmissionResponse:
    response = await service.create(payload)
    await session.commit()
    return response


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: str, service: SubmissionService = Depends(submission_service)) -> SubmissionResponse:
    return await service.get(submission_id)


@router.get("/candidate/submissions", response_model=list[SubmissionResponse])
async def candidate_submissions(service: SubmissionService = Depends(submission_service)) -> list[SubmissionResponse]:
    return await service.list_candidate()


@router.get("/employer/opportunities/{opportunity_id}/submissions", response_model=list[SubmissionResponse])
async def opportunity_submissions(
    opportunity_id: str,
    service: SubmissionService = Depends(submission_service),
) -> list[SubmissionResponse]:
    return await service.list_opportunity(opportunity_id)
