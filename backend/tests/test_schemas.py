import pytest

from app.schemas.media import MediaAsset
from app.schemas.opportunity import CreateOpportunityRequest
from app.schemas.submission import CreateSubmissionRequest


def media() -> MediaAsset:
    return MediaAsset(
        public_id="reelhire/submissions/test",
        secure_url="https://res.cloudinary.com/demo/video/upload/test.mp4",
        resource_type="video",
        format="mp4",
        bytes=2048,
        duration_seconds=42,
    )


def test_create_opportunity_schema() -> None:
    payload = CreateOpportunityRequest(
        role_title="Backend Engineer",
        short_description="Build resilient queueing for delayed shipments.",
        challenge_title="Design a job queue",
        challenge_description="Build a queue service and document retry behavior under failure.",
        skills=["Go", "Postgres"],
        location="Berlin",
        work_mode="hybrid",
        expected_challenge_duration="4-6 hours",
        pitch_video=media(),
    )

    assert payload.work_mode == "hybrid"


def test_create_submission_schema_validates_github() -> None:
    payload = CreateSubmissionRequest(
        opportunity_id="opp-1",
        github_url="https://github.com/alexmorgan-dev/incident-queue",
        explanation_video=media(),
    )
    assert str(payload.github_url).startswith("https://github.com/")


def test_create_submission_schema_rejects_non_github() -> None:
    with pytest.raises(ValueError):
        CreateSubmissionRequest(
            opportunity_id="opp-1",
            github_url="https://gitlab.com/alex/project",
            explanation_video=media(),
        )
