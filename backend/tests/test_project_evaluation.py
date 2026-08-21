from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.dependencies.identity import EmployerIdentity
from app.models.evaluation import ProjectEvaluation
from app.models.opportunity import Opportunity
from app.models.submission import Submission
from app.schemas.evaluation import (
    ChallengeContext,
    EvidenceItem,
    ProjectEvaluationResult,
    RepositoryEvidence,
    RepositoryFileEvidence,
)
from app.services.project_evaluation_service import ProjectEvaluationService, calculate_overall_score, clamp_score
from app.services.repository_inspector import GitHubRepositoryInspector, normalize_github_url


class FakeEvaluationRepository:
    def __init__(self) -> None:
        self.item: ProjectEvaluation | None = None
        self.upsert_count = 0

    async def get_for_submission(self, submission_id: str):
        return self.item if self.item and self.item.submission_id == submission_id else None

    async def upsert(self, evaluation: ProjectEvaluation):
        self.upsert_count += 1
        evaluation.id = evaluation.id or "pe-test"
        evaluation.created_at = datetime.now(UTC)
        evaluation.updated_at = datetime.now(UTC)
        self.item = evaluation
        return evaluation


class FakeSubmissionRepository:
    def __init__(self, submission: Submission | None) -> None:
        self.submission = submission

    async def get(self, submission_id: str):
        return self.submission if self.submission and self.submission.id == submission_id else None


class FakeOpportunityRepository:
    def __init__(self, opportunity: Opportunity | None) -> None:
        self.opportunity = opportunity

    async def get(self, opportunity_id: str):
        return self.opportunity if self.opportunity and self.opportunity.id == opportunity_id else None


class FakeInspector:
    def __init__(self) -> None:
        self.called = False

    def inspect(self, github_url: str):
        self.called = True
        assert github_url == "https://github.com/acme/queue"
        return RepositoryEvidence(
            url=github_url,
            file_count_examined=2,
            languages_detected=["Go"],
            has_readme=True,
            has_tests=False,
            tree=["README.md", "main.go"],
            readme="Build notes",
            files=[RepositoryFileEvidence(path="main.go", content="package main")],
        )


class FakeEvaluator:
    def __init__(self, result: ProjectEvaluationResult | None = None) -> None:
        self.result = result or ProjectEvaluationResult(
            challenge_completion=110,
            code_quality=80,
            architecture=70,
            testing=-5,
            documentation=60,
            summary="The repository addresses the queue challenge with clear code and limited test evidence.",
            strengths=["Clear queue implementation"],
            concerns=["No automated tests were found in the inspected repository."],
            evidence=[
                EvidenceItem(
                    category="testing",
                    file_path=None,
                    observation="No automated tests were found in the inspected repository.",
                )
            ],
        )

    async def evaluate(self, challenge: ChallengeContext, repository: RepositoryEvidence):
        assert challenge.challenge_title == "Design a job queue"
        assert repository.file_count_examined == 2
        return self.result


def submission() -> Submission:
    return Submission(
        id="sub-test",
        candidate_id="cand-alex",
        opportunity_id="opp-test",
        github_url="https://github.com/acme/queue",
        status="submitted",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def opportunity(employer_id: str = "emp-nova") -> Opportunity:
    return Opportunity(
        id="opp-test",
        employer_id=employer_id,
        company_name="Nova Systems",
        role_title="Backend Engineer",
        short_description="Build a queue.",
        challenge_title="Design a job queue",
        challenge_description="Implement a retry-aware queue and document trade-offs.",
        skills=["Go", "Postgres"],
        location="Berlin",
        work_mode="hybrid",
        expected_challenge_duration="4-6 hours",
        status="published",
        created_at=datetime.now(UTC),
    )


def test_normalize_github_url_accepts_public_https_repo() -> None:
    assert normalize_github_url("https://github.com/acme/queue") == "https://github.com/acme/queue.git"


@pytest.mark.parametrize("url", ["git@github.com:acme/queue.git", "https://gitlab.com/acme/queue", "file:///tmp/repo", "https://github.com/acme"])
def test_normalize_github_url_rejects_unsupported_urls(url: str) -> None:
    with pytest.raises(HTTPException):
        normalize_github_url(url)


def test_repository_inspector_filters_generated_and_binary_files(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / "README.md").write_text("hello", encoding="utf-8")
    (repo / "main.go").write_text("package main", encoding="utf-8")
    (repo / "main_test.go").write_text("package main", encoding="utf-8")
    (repo / "node_modules").mkdir()
    (repo / "node_modules" / "ignored.ts").write_text("ignore me", encoding="utf-8")
    (repo / "image.png").write_bytes(b"\x89PNG\x00binary")

    inspector = GitHubRepositoryInspector()
    evidence = inspector._collect("https://github.com/acme/queue", repo)

    assert evidence.has_readme is True
    assert evidence.has_tests is True
    assert "Go" in evidence.languages_detected
    assert "node_modules/ignored.ts" not in evidence.tree
    assert "image.png" not in evidence.tree


def test_score_calculation_clamps_dimensions_before_weighting() -> None:
    assert clamp_score(120) == 100
    assert clamp_score(-4) == 0
    assert calculate_overall_score(
        challenge_completion=100,
        code_quality=80,
        architecture=70,
        testing=0,
        documentation=60,
    ) == 70


@pytest.mark.asyncio
async def test_project_evaluation_persists_weighted_result() -> None:
    evaluations = FakeEvaluationRepository()
    service = ProjectEvaluationService(
        evaluations,
        FakeSubmissionRepository(submission()),  # type: ignore[arg-type]
        FakeOpportunityRepository(opportunity()),  # type: ignore[arg-type]
        EmployerIdentity(),
        FakeInspector(),  # type: ignore[arg-type]
        FakeEvaluator(),
    )

    response = await service.analyze_submission("sub-test")

    assert response.overall_score == 70
    assert response.challenge_completion == 100
    assert response.testing == 0
    assert evaluations.upsert_count == 1
    assert response.evidence[0].observation.startswith("No automated tests")


@pytest.mark.asyncio
async def test_project_evaluation_reuses_completed_result_without_reanalysis() -> None:
    existing = ProjectEvaluation(
        id="pe-existing",
        submission_id="sub-test",
        overall_score=82,
        challenge_completion=80,
        code_quality=82,
        architecture=83,
        testing=80,
        documentation=90,
        summary="Existing result",
        strengths=["Existing strength"],
        concerns=[],
        evidence=[],
        status="completed",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    evaluations = FakeEvaluationRepository()
    evaluations.item = existing
    inspector = FakeInspector()
    service = ProjectEvaluationService(
        evaluations,
        FakeSubmissionRepository(submission()),  # type: ignore[arg-type]
        FakeOpportunityRepository(opportunity()),  # type: ignore[arg-type]
        EmployerIdentity(),
        inspector,  # type: ignore[arg-type]
        FakeEvaluator(),
    )

    response = await service.analyze_submission("sub-test")

    assert response.id == "pe-existing"
    assert response.overall_score == 82
    assert inspector.called is False


@pytest.mark.asyncio
async def test_project_evaluation_rejects_wrong_employer() -> None:
    service = ProjectEvaluationService(
        FakeEvaluationRepository(),  # type: ignore[arg-type]
        FakeSubmissionRepository(submission()),  # type: ignore[arg-type]
        FakeOpportunityRepository(opportunity(employer_id="emp-other")),  # type: ignore[arg-type]
        EmployerIdentity(),
        FakeInspector(),  # type: ignore[arg-type]
        FakeEvaluator(),
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.analyze_submission("sub-test")

    assert exc_info.value.status_code == 403
