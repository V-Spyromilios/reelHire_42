from datetime import UTC, datetime

import pytest
from sqlalchemy.dialects import postgresql

from app.models.submission import Submission
from app.repositories.submission_repository import SubmissionRepository


class ScalarResult:
    def __init__(self, submission: Submission):
        self.submission = submission

    def one(self) -> Submission:
        return self.submission


class CapturingSession:
    def __init__(self, submission: Submission):
        self.submission = submission
        self.statement = None

    async def scalars(self, statement):
        statement.compile(dialect=postgresql.dialect())
        self.statement = statement
        return ScalarResult(self.submission)


@pytest.mark.asyncio
async def test_submission_upsert_builds_atomic_duplicate_analysis_guard() -> None:
    submission = Submission(
        id="sub-test",
        candidate_id="cand-test",
        opportunity_id="opp-test",
        github_url="https://github.com/acme/queue-service",
        status="analysis_pending",
        analysis_run_id="analysis-test",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session = CapturingSession(submission)

    await SubmissionRepository(session).upsert(submission)  # type: ignore[arg-type]

    sql = str(session.statement.compile(dialect=postgresql.dialect()))
    assert "ON CONFLICT ON CONSTRAINT uq_candidate_submission_opportunity" in sql
    assert "CASE WHEN" in sql
    assert "excluded.github_url" in sql
