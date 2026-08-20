import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, case, func, or_, select, update
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
        values = {
            "candidate_id": submission.candidate_id,
            "opportunity_id": submission.opportunity_id,
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
            "analysis": submission.analysis,
            "analysis_error": submission.analysis_error,
            "analysis_model": submission.analysis_model,
            "analysis_commit_sha": submission.analysis_commit_sha,
            "analysis_run_id": submission.analysis_run_id,
            "analysis_started_at": submission.analysis_started_at,
            "analysis_evaluated_at": submission.analysis_evaluated_at,
        }
        if submission.id:
            values["id"] = submission.id

        insert_statement = insert(Submission).values(**values)
        preserve_analysis = and_(
            Submission.github_url == insert_statement.excluded.github_url,
            Submission.status.in_(("analysis_pending", "analysis_complete")),
        )
        statement = (
            insert_statement
            .on_conflict_do_update(
                constraint="uq_candidate_submission_opportunity",
                set_={
                    "github_url": insert_statement.excluded.github_url,
                    "explanation_video_public_id": insert_statement.excluded.explanation_video_public_id,
                    "explanation_video_secure_url": insert_statement.excluded.explanation_video_secure_url,
                    "explanation_video_duration_seconds": insert_statement.excluded.explanation_video_duration_seconds,
                    "explanation_video_format": insert_statement.excluded.explanation_video_format,
                    "explanation_video_bytes": insert_statement.excluded.explanation_video_bytes,
                    "explanation_video_width": insert_statement.excluded.explanation_video_width,
                    "explanation_video_height": insert_statement.excluded.explanation_video_height,
                    "explanation_video_created_at": insert_statement.excluded.explanation_video_created_at,
                    "status": case((preserve_analysis, Submission.status), else_=insert_statement.excluded.status),
                    "analysis": case((preserve_analysis, Submission.analysis), else_=insert_statement.excluded.analysis),
                    "analysis_error": case(
                        (preserve_analysis, Submission.analysis_error),
                        else_=insert_statement.excluded.analysis_error,
                    ),
                    "analysis_model": case(
                        (preserve_analysis, Submission.analysis_model),
                        else_=insert_statement.excluded.analysis_model,
                    ),
                    "analysis_commit_sha": case(
                        (preserve_analysis, Submission.analysis_commit_sha),
                        else_=insert_statement.excluded.analysis_commit_sha,
                    ),
                    "analysis_run_id": case(
                        (preserve_analysis, Submission.analysis_run_id),
                        else_=insert_statement.excluded.analysis_run_id,
                    ),
                    "analysis_started_at": case(
                        (preserve_analysis, Submission.analysis_started_at),
                        else_=insert_statement.excluded.analysis_started_at,
                    ),
                    "analysis_evaluated_at": case(
                        (preserve_analysis, Submission.analysis_evaluated_at),
                        else_=insert_statement.excluded.analysis_evaluated_at,
                    ),
                    "updated_at": func.now(),
                },
            )
            .returning(Submission)
            .execution_options(populate_existing=True)
        )
        result = await self.session.scalars(statement)
        return result.one()

    async def list_claimable_analysis_jobs(
        self,
        lease_before: datetime,
        limit: int = 2,
    ) -> list[tuple[str, str | None]]:
        result = await self.session.execute(
            select(Submission.id, Submission.analysis_run_id)
            .where(
                or_(
                    Submission.status == "submitted",
                    and_(Submission.status == "analysis_complete", Submission.analysis.is_(None)),
                    and_(
                        Submission.status == "analysis_pending",
                        or_(
                            Submission.analysis_started_at.is_(None),
                            Submission.analysis_started_at < lease_before,
                        ),
                    ),
                )
            )
            .order_by(Submission.updated_at.asc())
            .limit(limit)
        )
        return [(submission_id, run_id) for submission_id, run_id in result.all()]

    async def claim_analysis_job(
        self,
        submission_id: str,
        expected_run_id: str | None,
        lease_before: datetime,
    ) -> Submission | None:
        claim_id = f"analysis-{uuid.uuid4().hex}"
        expected_claim = (
            Submission.analysis_run_id.is_(None)
            if expected_run_id is None
            else Submission.analysis_run_id == expected_run_id
        )
        statement = (
            update(Submission)
            .where(
                Submission.id == submission_id,
                expected_claim,
                or_(
                    Submission.status == "submitted",
                    and_(Submission.status == "analysis_complete", Submission.analysis.is_(None)),
                    and_(
                        Submission.status == "analysis_pending",
                        or_(
                            Submission.analysis_started_at.is_(None),
                            Submission.analysis_started_at < lease_before,
                        ),
                    ),
                ),
            )
            .values(
                status="analysis_pending",
                analysis=None,
                analysis_error=None,
                analysis_model=None,
                analysis_commit_sha=None,
                analysis_run_id=claim_id,
                analysis_started_at=datetime.now(timezone.utc),
                analysis_evaluated_at=None,
                updated_at=func.now(),
            )
            .returning(Submission)
            .execution_options(populate_existing=True)
        )
        result = await self.session.scalars(statement)
        return result.one_or_none()

    async def mark_analysis_complete(
        self,
        submission_id: str,
        run_id: str,
        github_url: str,
        analysis: dict[str, Any],
        model: str,
        commit_sha: str,
    ) -> bool:
        statement = (
            update(Submission)
            .where(
                Submission.id == submission_id,
                Submission.analysis_run_id == run_id,
                Submission.github_url == github_url,
                Submission.status == "analysis_pending",
            )
            .values(
                status="analysis_complete",
                analysis=analysis,
                analysis_error=None,
                analysis_model=model,
                analysis_commit_sha=commit_sha,
                analysis_evaluated_at=datetime.now(timezone.utc),
                updated_at=func.now(),
            )
        )
        result = await self.session.execute(statement)
        return result.rowcount == 1

    async def mark_analysis_failed(self, submission_id: str, run_id: str, github_url: str, error: str) -> bool:
        statement = (
            update(Submission)
            .where(
                Submission.id == submission_id,
                Submission.analysis_run_id == run_id,
                Submission.github_url == github_url,
                Submission.status == "analysis_pending",
            )
            .values(
                status="analysis_failed",
                analysis=None,
                analysis_error=error[:2_000],
                analysis_model=None,
                analysis_commit_sha=None,
                analysis_evaluated_at=datetime.now(timezone.utc),
                updated_at=func.now(),
            )
        )
        result = await self.session.execute(statement)
        return result.rowcount == 1

    async def retry_failed_analysis(
        self,
        submission_id: str,
        candidate_id: str,
        run_id: str,
    ) -> Submission | None:
        statement = (
            update(Submission)
            .where(
                Submission.id == submission_id,
                Submission.candidate_id == candidate_id,
                Submission.status == "analysis_failed",
            )
            .values(
                status="analysis_pending",
                analysis=None,
                analysis_error=None,
                analysis_model=None,
                analysis_commit_sha=None,
                analysis_run_id=run_id,
                analysis_started_at=None,
                analysis_evaluated_at=None,
                updated_at=func.now(),
            )
            .returning(Submission)
            .execution_options(populate_existing=True)
        )
        result = await self.session.scalars(statement)
        return result.one_or_none()
