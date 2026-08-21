import uuid

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission


class SubmissionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, submission_id: str) -> Submission | None:
        return await self.session.get(Submission, submission_id)

    async def get_for_candidate_opportunity(self, candidate_id: str, opportunity_id: str) -> Submission | None:
        result = await self.session.scalars(
            select(Submission).where(
                Submission.candidate_id == candidate_id,
                Submission.opportunity_id == opportunity_id,
            )
        )
        return result.first()

    async def list_for_candidate(self, candidate_id: str) -> list[Submission]:
        result = await self.session.scalars(
            select(Submission).where(Submission.candidate_id == candidate_id).order_by(Submission.created_at.desc())
        )
        return list(result)

    async def list_for_opportunity(self, opportunity_id: str) -> list[Submission]:
        result = await self.session.scalars(
            select(Submission).where(Submission.opportunity_id == opportunity_id).order_by(Submission.created_at.desc())
        )
        return list(result)

    async def count_for_opportunity(self, opportunity_id: str) -> int:
        result = await self.session.scalars(select(Submission.id).where(Submission.opportunity_id == opportunity_id).limit(1))
        return 1 if result.first() else 0

    async def count_all_for_opportunity(self, opportunity_id: str) -> int:
        result = await self.session.scalars(select(Submission.id).where(Submission.opportunity_id == opportunity_id))
        return len(list(result))

    async def upsert(self, submission: Submission) -> Submission:
        submission_id = submission.id or f"sub-{uuid.uuid4().hex[:12]}"
        statement = (
            insert(Submission)
            .values(
                id=submission_id,
                candidate_id=submission.candidate_id,
                opportunity_id=submission.opportunity_id,
                github_url=submission.github_url,
                explanation_video_public_id=submission.explanation_video_public_id,
                explanation_video_secure_url=submission.explanation_video_secure_url,
                explanation_video_duration_seconds=submission.explanation_video_duration_seconds,
                explanation_video_format=submission.explanation_video_format,
                explanation_video_bytes=submission.explanation_video_bytes,
                explanation_video_width=submission.explanation_video_width,
                explanation_video_height=submission.explanation_video_height,
                explanation_video_created_at=submission.explanation_video_created_at,
                status=submission.status,
            )
            .on_conflict_do_update(
                constraint="uq_candidate_submission_opportunity",
                set_={
                    "github_url": submission.github_url,
                    "explanation_video_public_id": submission.explanation_video_public_id,
                    "explanation_video_secure_url": submission.explanation_video_secure_url,
                    "explanation_video_duration_seconds": submission.explanation_video_duration_seconds,
                    "explanation_video_format": submission.explanation_video_format,
                    "explanation_video_bytes": submission.explanation_video_bytes,
                    "explanation_video_width": submission.explanation_video_width,
                    "explanation_video_height": submission.explanation_video_height,
                    "explanation_video_created_at": submission.explanation_video_created_at,
                    "status": submission.status,
                },
            )
            .returning(Submission)
        )
        result = await self.session.scalars(statement)
        return result.one()

    async def set_status(self, submission_id: str, status: str) -> Submission | None:
        statement = update(Submission).where(Submission.id == submission_id).values(status=status).returning(Submission)
        result = await self.session.scalars(statement)
        return result.first()
