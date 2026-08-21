from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.dependencies.identity import CandidateIdentity, EmployerIdentity, get_current_candidate, get_current_employer
from app.repositories.match_repository import MatchRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.match import EmployerSubmissionReactionResponse, MatchResponse
from app.schemas.reaction import EmployerReactionRequest
from app.schemas.submission import CreateSubmissionRequest, SubmissionResponse
from app.services.match_service import MatchService
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/api", tags=["submissions"])


def submission_service(
    session: AsyncSession = Depends(get_session),
    candidate: CandidateIdentity = Depends(get_current_candidate),
    employer: EmployerIdentity = Depends(get_current_employer),
) -> SubmissionService:
    return SubmissionService(
        SubmissionRepository(session),
        OpportunityRepository(session),
        candidate,
        employer,
        MatchRepository(session),
    )


def match_service(
    session: AsyncSession = Depends(get_session),
    candidate: CandidateIdentity = Depends(get_current_candidate),
    employer: EmployerIdentity = Depends(get_current_employer),
) -> MatchService:
    return MatchService(
        MatchRepository(session),
        SubmissionRepository(session),
        OpportunityRepository(session),
        employer,
        candidate,
    )


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


@router.get("/employer/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_employer_submission(
    submission_id: str,
    service: SubmissionService = Depends(submission_service),
) -> SubmissionResponse:
    return await service.get_employer_submission(submission_id)


@router.get("/candidate/submissions", response_model=list[SubmissionResponse])
async def candidate_submissions(service: SubmissionService = Depends(submission_service)) -> list[SubmissionResponse]:
    return await service.list_candidate()


@router.get("/employer/opportunities/{opportunity_id}/submissions", response_model=list[SubmissionResponse])
async def opportunity_submissions(
    opportunity_id: str,
    service: SubmissionService = Depends(submission_service),
) -> list[SubmissionResponse]:
    return await service.list_opportunity(opportunity_id)


@router.post("/employer/submissions/{submission_id}/reaction", response_model=EmployerSubmissionReactionResponse)
async def react_to_submission(
    submission_id: str,
    payload: EmployerReactionRequest,
    session: AsyncSession = Depends(get_session),
    service: MatchService = Depends(match_service),
) -> EmployerSubmissionReactionResponse:
    response = await service.react_to_submission(submission_id, payload)
    await session.commit()
    return response


@router.get("/employer/matches", response_model=list[MatchResponse])
async def employer_matches(service: MatchService = Depends(match_service)) -> list[MatchResponse]:
    return await service.list_employer_matches()


@router.get("/candidate/matches", response_model=list[MatchResponse])
async def candidate_matches(service: MatchService = Depends(match_service)) -> list[MatchResponse]:
    return await service.list_candidate_matches()


@router.post("/matches/{match_id}/interview", response_model=MatchResponse)
async def request_interview(
    match_id: str,
    session: AsyncSession = Depends(get_session),
    service: MatchService = Depends(match_service),
) -> MatchResponse:
    response = await service.request_interview(match_id)
    await session.commit()
    return response
