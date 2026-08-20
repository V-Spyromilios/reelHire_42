import uuid

from fastapi import HTTPException, status

from app.dependencies.identity import CandidateIdentity
from app.models.submission import Submission
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.media import MediaAssetResponse
from app.schemas.submission import CandidateResponse, CreateSubmissionRequest, ProjectAnalysisResponse, SubmissionResponse
from app.services.github_repository import parse_github_repository_url


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


def submission_response(submission: Submission, candidate: CandidateIdentity) -> SubmissionResponse:
    analysis = ProjectAnalysisResponse.model_validate(submission.analysis) if submission.analysis else None
    return SubmissionResponse(
        id=submission.id,
        candidate=candidate_response(candidate),
        candidate_id=submission.candidate_id,
        opportunity_id=submission.opportunity_id,
        github_url=submission.github_url,
        explanation_video=media_from_submission(submission),
        explanation_video_secure_url=submission.explanation_video_secure_url,
        status=submission.status,
        analysis=analysis,
        analysis_error=submission.analysis_error,
        analysis_model=submission.analysis_model,
        analysis_commit_sha=submission.analysis_commit_sha,
        analysis_evaluated_at=submission.analysis_evaluated_at,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
    )


class SubmissionService:
    def __init__(
        self,
        repository: SubmissionRepository,
        opportunity_repository: OpportunityRepository,
        candidate: CandidateIdentity,
    ):
        self.repository = repository
        self.opportunity_repository = opportunity_repository
        self.candidate = candidate

    async def create(self, payload: CreateSubmissionRequest) -> SubmissionResponse:
        if not await self.opportunity_repository.get(payload.opportunity_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")

        media = payload.explanation_video
        github_url = parse_github_repository_url(str(payload.github_url)).url
        existing = await self.repository.get_for_candidate_opportunity(self.candidate.id, payload.opportunity_id)
        submission = existing or Submission(
            id=f"sub-{uuid.uuid4().hex[:12]}",
            candidate_id=self.candidate.id,
            opportunity_id=payload.opportunity_id,
        )
        preserve_analysis = bool(
            existing
            and existing.github_url == github_url
            and existing.status in {"analysis_pending", "analysis_complete"}
        )

        submission.github_url = github_url
        submission.explanation_video_public_id = media.public_id
        submission.explanation_video_secure_url = str(media.secure_url)
        submission.explanation_video_duration_seconds = media.duration_seconds
        submission.explanation_video_format = media.format
        submission.explanation_video_bytes = media.bytes
        submission.explanation_video_width = media.width
        submission.explanation_video_height = media.height
        submission.explanation_video_created_at = media.created_at
        if not preserve_analysis:
            submission.status = "analysis_pending"
            submission.analysis = None
            submission.analysis_error = None
            submission.analysis_model = None
            submission.analysis_commit_sha = None
            submission.analysis_run_id = f"analysis-{uuid.uuid4().hex}"
            submission.analysis_started_at = None
            submission.analysis_evaluated_at = None

        saved = await self.repository.upsert(submission)
        return submission_response(saved, self.candidate)

    async def get(self, submission_id: str) -> SubmissionResponse:
        submission = await self.repository.get(submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
        return submission_response(submission, self.candidate)

    async def retry_analysis(self, submission_id: str) -> SubmissionResponse:
        submission = await self.repository.get(submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
        if submission.candidate_id != self.candidate.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot retry this submission.")
        if submission.status != "analysis_failed":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only a failed analysis can be retried.")

        retried = await self.repository.retry_failed_analysis(
            submission_id,
            self.candidate.id,
            f"analysis-{uuid.uuid4().hex}",
        )
        if not retried:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This analysis is already being retried.")
        return submission_response(retried, self.candidate)

    async def list_candidate(self) -> list[SubmissionResponse]:
        return [submission_response(item, self.candidate) for item in await self.repository.list_for_candidate(self.candidate.id)]

    async def list_opportunity(self, opportunity_id: str) -> list[SubmissionResponse]:
        return [submission_response(item, self.candidate) for item in await self.repository.list_for_opportunity(opportunity_id)]
