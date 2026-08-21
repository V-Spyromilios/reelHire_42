import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evaluation import ProjectEvaluation


class ProjectEvaluationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_for_submission(self, submission_id: str) -> ProjectEvaluation | None:
        result = await self.session.scalars(
            select(ProjectEvaluation).where(ProjectEvaluation.submission_id == submission_id)
        )
        return result.first()

    async def upsert(self, evaluation: ProjectEvaluation) -> ProjectEvaluation:
        evaluation_id = evaluation.id or f"pe-{uuid.uuid4().hex[:12]}"
        now = datetime.now(UTC)
        statement = (
            insert(ProjectEvaluation)
            .values(
                id=evaluation_id,
                submission_id=evaluation.submission_id,
                overall_score=evaluation.overall_score,
                challenge_completion=evaluation.challenge_completion,
                code_quality=evaluation.code_quality,
                architecture=evaluation.architecture,
                testing=evaluation.testing,
                documentation=evaluation.documentation,
                summary=evaluation.summary,
                strengths=evaluation.strengths,
                concerns=evaluation.concerns,
                evidence=evaluation.evidence,
                status=evaluation.status,
                error_message=evaluation.error_message,
                updated_at=now,
            )
            .on_conflict_do_update(
                constraint="uq_project_evaluation_submission",
                set_={
                    "overall_score": evaluation.overall_score,
                    "challenge_completion": evaluation.challenge_completion,
                    "code_quality": evaluation.code_quality,
                    "architecture": evaluation.architecture,
                    "testing": evaluation.testing,
                    "documentation": evaluation.documentation,
                    "summary": evaluation.summary,
                    "strengths": evaluation.strengths,
                    "concerns": evaluation.concerns,
                    "evidence": evaluation.evidence,
                    "status": evaluation.status,
                    "error_message": evaluation.error_message,
                    "updated_at": now,
                },
            )
            .returning(ProjectEvaluation)
        )
        result = await self.session.scalars(statement)
        return result.one()
