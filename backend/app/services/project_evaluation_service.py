from fastapi import HTTPException, status

from app.dependencies.identity import EmployerIdentity
from app.models.evaluation import ProjectEvaluation
from app.repositories.evaluation_repository import ProjectEvaluationRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.evaluation import ChallengeContext, ProjectEvaluationResponse
from app.services.project_evaluator import ProjectEvaluator
from app.services.repository_inspector import GitHubRepositoryInspector, RepositoryCloneError


def clamp_score(value: int | float) -> int:
    return max(0, min(100, round(value)))


def calculate_overall_score(
    *,
    challenge_completion: int,
    code_quality: int,
    architecture: int,
    testing: int,
    documentation: int,
) -> int:
    return clamp_score(
        challenge_completion * 0.30
        + code_quality * 0.25
        + architecture * 0.20
        + testing * 0.15
        + documentation * 0.10
    )


def project_evaluation_response(evaluation: ProjectEvaluation) -> ProjectEvaluationResponse:
    return ProjectEvaluationResponse(
        id=evaluation.id,
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
        created_at=evaluation.created_at,
        updated_at=evaluation.updated_at,
    )


class ProjectEvaluationService:
    def __init__(
        self,
        evaluation_repository: ProjectEvaluationRepository,
        submission_repository: SubmissionRepository,
        opportunity_repository: OpportunityRepository,
        employer: EmployerIdentity,
        inspector: GitHubRepositoryInspector,
        evaluator: ProjectEvaluator,
    ):
        self.evaluation_repository = evaluation_repository
        self.submission_repository = submission_repository
        self.opportunity_repository = opportunity_repository
        self.employer = employer
        self.inspector = inspector
        self.evaluator = evaluator

    async def analyze_submission(self, submission_id: str, force: bool = False) -> ProjectEvaluationResponse:
        submission = await self.submission_repository.get(submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

        opportunity = await self.opportunity_repository.get(submission.opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")
        if opportunity.employer_id != self.employer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to analyze this submission.")

        existing = await self.evaluation_repository.get_for_submission(submission_id)
        if existing and existing.status == "completed" and not force:
            return project_evaluation_response(existing)

        try:
            repository = self.inspector.inspect(submission.github_url)
        except RepositoryCloneError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not clone or inspect the public GitHub repository.") from exc

        challenge = ChallengeContext(
            role_title=opportunity.role_title,
            challenge_title=opportunity.challenge_title,
            challenge_description=opportunity.challenge_description,
            expected_challenge_duration=opportunity.expected_challenge_duration,
            skills=opportunity.skills,
        )
        result = await self.evaluator.evaluate(challenge, repository)

        challenge_completion = clamp_score(result.challenge_completion)
        code_quality = clamp_score(result.code_quality)
        architecture = clamp_score(result.architecture)
        testing = clamp_score(result.testing)
        documentation = clamp_score(result.documentation)
        overall_score = calculate_overall_score(
            challenge_completion=challenge_completion,
            code_quality=code_quality,
            architecture=architecture,
            testing=testing,
            documentation=documentation,
        )

        saved = await self.evaluation_repository.upsert(
            ProjectEvaluation(
                id=existing.id if existing else None,
                submission_id=submission.id,
                overall_score=overall_score,
                challenge_completion=challenge_completion,
                code_quality=code_quality,
                architecture=architecture,
                testing=testing,
                documentation=documentation,
                summary=result.summary,
                strengths=result.strengths,
                concerns=result.concerns,
                evidence=[item.model_dump() for item in result.evidence],
                status="completed",
                error_message=None,
            )
        )
        return project_evaluation_response(saved)
