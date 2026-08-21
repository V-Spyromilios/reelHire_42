from fastapi import HTTPException, status

from app.dependencies.identity import CandidateIdentity, EmployerIdentity
from app.models.match import EmployerReaction, Match
from app.models.evaluation import ProjectEvaluation
from app.repositories.evaluation_repository import ProjectEvaluationRepository
from app.models.submission import Submission
from app.repositories.match_repository import MatchRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.media import MediaAssetResponse
from app.schemas.reaction import EmployerReactionResponse
from app.schemas.submission import CandidateResponse, CreateSubmissionRequest, SubmissionResponse
from app.services.project_evaluation_service import project_evaluation_response


def candidate_response(identity: CandidateIdentity) -> CandidateResponse:
    return CandidateResponse(
        id=identity.id,
        name=identity.name,
        avatarUrl=identity.avatar_url,
        headline=identity.headline,
        location=identity.location,
        skills=list(identity.skills),
        githubUsername=identity.github_username,
    )


def media_from_submission(submission: Submission) -> MediaAssetResponse | None:
    if not submission.explanation_video_public_id or not submission.explanation_video_secure_url:
        return None
    return MediaAssetResponse(
        public_id=submission.explanation_video_public_id,
        secure_url=submission.explanation_video_secure_url,
        resource_type="video",
        format=submission.explanation_video_format or "mp4",
        bytes=submission.explanation_video_bytes or 1,
        width=submission.explanation_video_width,
        height=submission.explanation_video_height,
        duration_seconds=submission.explanation_video_duration_seconds,
        created_at=submission.explanation_video_created_at,
    )


def employer_reaction_response(reaction: EmployerReaction | None) -> EmployerReactionResponse | None:
    if reaction is None:
        return None
    return EmployerReactionResponse(
        id=reaction.id,
        employerId=reaction.employer_id,
        submissionId=reaction.submission_id,
        reaction=reaction.reaction,
        reactedAt=reaction.reacted_at,
        updatedAt=reaction.updated_at,
    )


def submission_response(
    submission: Submission,
    candidate: CandidateIdentity,
    employer_reaction: EmployerReaction | None = None,
    match: Match | None = None,
    project_evaluation: ProjectEvaluation | None = None,
) -> SubmissionResponse:
    return SubmissionResponse(
        id=submission.id,
        candidate=candidate_response(candidate),
        candidate_id=submission.candidate_id,
        opportunity_id=submission.opportunity_id,
        github_url=submission.github_url,
        explanation_video=media_from_submission(submission),
        explanation_video_secure_url=submission.explanation_video_secure_url,
        status=submission.status,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
        employer_reaction=employer_reaction_response(employer_reaction),
        match_id=match.id if match else None,
        match_status=match.status if match else None,
        project_evaluation=project_evaluation_response(project_evaluation) if project_evaluation else None,
    )


class SubmissionService:
    def __init__(
        self,
        repository: SubmissionRepository,
        opportunity_repository: OpportunityRepository,
        candidate: CandidateIdentity,
        employer: EmployerIdentity | None = None,
        match_repository: MatchRepository | None = None,
        evaluation_repository: ProjectEvaluationRepository | None = None,
    ):
        self.repository = repository
        self.opportunity_repository = opportunity_repository
        self.candidate = candidate
        self.employer = employer
        self.match_repository = match_repository
        self.evaluation_repository = evaluation_repository

    async def create(self, payload: CreateSubmissionRequest) -> SubmissionResponse:
        if not await self.opportunity_repository.get(payload.opportunity_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")

        media = payload.explanation_video
        submission = Submission(
            candidate_id=self.candidate.id,
            opportunity_id=payload.opportunity_id,
            github_url=str(payload.github_url),
            explanation_video_public_id=media.public_id,
            explanation_video_secure_url=str(media.secure_url),
            explanation_video_duration_seconds=media.duration_seconds,
            explanation_video_format=media.format,
            explanation_video_bytes=media.bytes,
            explanation_video_width=media.width,
            explanation_video_height=media.height,
            explanation_video_created_at=media.created_at,
            status="submitted",
        )
        saved = await self.repository.upsert(submission)
        return submission_response(saved, self.candidate)

    async def get(self, submission_id: str) -> SubmissionResponse:
        submission = await self.repository.get(submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
        return submission_response(submission, self.candidate)

    async def get_employer_submission(self, submission_id: str) -> SubmissionResponse:
        submission = await self.repository.get(submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
        await self._verify_employer_opportunity(submission.opportunity_id)
        reaction, match, evaluation = await self._review_metadata(submission.id)
        return submission_response(submission, self.candidate, reaction, match, evaluation)

    async def list_candidate(self) -> list[SubmissionResponse]:
        return [submission_response(item, self.candidate) for item in await self.repository.list_for_candidate(self.candidate.id)]

    async def list_opportunity(self, opportunity_id: str) -> list[SubmissionResponse]:
        await self._verify_employer_opportunity(opportunity_id)
        responses: list[SubmissionResponse] = []
        for item in await self.repository.list_for_opportunity(opportunity_id):
            reaction, match, evaluation = await self._review_metadata(item.id)
            responses.append(submission_response(item, self.candidate, reaction, match, evaluation))
        return responses

    async def _verify_employer_opportunity(self, opportunity_id: str) -> None:
        if self.employer is None:
            return
        opportunity = await self.opportunity_repository.get(opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")
        if opportunity.employer_id != self.employer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to review this opportunity.")

    async def _review_metadata(self, submission_id: str) -> tuple[EmployerReaction | None, Match | None, ProjectEvaluation | None]:
        reaction = await self.match_repository.get_employer_reaction_for_submission(submission_id) if self.match_repository else None
        match = await self.match_repository.get_match_by_submission(submission_id) if self.match_repository else None
        evaluation = await self.evaluation_repository.get_for_submission(submission_id) if self.evaluation_repository else None
        return reaction, match, evaluation
