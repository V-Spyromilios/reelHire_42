from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.dependencies.identity import CandidateIdentity, EmployerIdentity
from app.models.match import EmployerReaction, Match
from app.models.opportunity import Opportunity
from app.models.submission import Submission
from app.repositories.match_repository import MatchRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.match import EmployerSubmissionReactionResponse, MatchResponse
from app.schemas.opportunity import OpportunityResponse
from app.schemas.reaction import EmployerReactionRequest, EmployerReactionResponse
from app.schemas.submission import CandidateResponse
from app.services.opportunity_service import opportunity_response
from app.services.submission_service import candidate_response


def employer_reaction_response(reaction: EmployerReaction) -> EmployerReactionResponse:
    return EmployerReactionResponse(
        id=reaction.id,
        employerId=reaction.employer_id,
        submissionId=reaction.submission_id,
        reaction=reaction.reaction,
        reactedAt=reaction.reacted_at,
        updatedAt=reaction.updated_at,
    )


class MatchService:
    def __init__(
        self,
        match_repository: MatchRepository,
        submission_repository: SubmissionRepository,
        opportunity_repository: OpportunityRepository,
        employer: EmployerIdentity,
        candidate: CandidateIdentity,
    ):
        self.match_repository = match_repository
        self.submission_repository = submission_repository
        self.opportunity_repository = opportunity_repository
        self.employer = employer
        self.candidate = candidate

    async def react_to_submission(
        self,
        submission_id: str,
        payload: EmployerReactionRequest,
    ) -> EmployerSubmissionReactionResponse:
        submission, opportunity = await self._load_submission_for_employer(submission_id)
        existing_match = await self.match_repository.get_match_by_submission(submission_id)
        if existing_match and payload.reaction.value == "passed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This submission has already been matched.",
            )

        now = datetime.now(timezone.utc)
        reaction = await self.match_repository.upsert_employer_reaction(
            EmployerReaction(
                employer_id=self.employer.id,
                submission_id=submission_id,
                reaction=payload.reaction.value,
                reacted_at=now,
                updated_at=now,
            )
        )

        match: Match | None = existing_match
        if payload.reaction.value == "accepted":
            if not await self.opportunity_repository.has_active_accepted_reaction(
                submission.candidate_id,
                submission.opportunity_id,
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Candidate is no longer active for this challenge.",
                )
            match = await self.match_repository.get_or_create_match(
                opportunity_id=submission.opportunity_id,
                submission_id=submission.id,
                candidate_id=submission.candidate_id,
                employer_id=self.employer.id,
                created_at=now,
            )
            await self.submission_repository.set_status(submission.id, "matched")

        return EmployerSubmissionReactionResponse(
            reaction=employer_reaction_response(reaction),
            match=self._match_response(match, opportunity) if match else None,
        )

    async def list_employer_matches(self) -> list[MatchResponse]:
        matches = await self.match_repository.list_for_employer(self.employer.id)
        return [await self._match_response_from_stored(item) for item in matches]

    async def list_candidate_matches(self) -> list[MatchResponse]:
        matches = await self.match_repository.list_for_candidate(self.candidate.id)
        return [await self._match_response_from_stored(item) for item in matches]

    async def request_interview(self, match_id: str) -> MatchResponse:
        match = await self.match_repository.get_match(match_id)
        if not match:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found.")
        if match.employer_id != self.employer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to update this match.")
        updated = await self.match_repository.request_interview(match_id)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found.")
        return await self._match_response_from_stored(updated)

    async def _load_submission_for_employer(self, submission_id: str) -> tuple[Submission, Opportunity]:
        submission = await self.submission_repository.get(submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
        if submission.status == "draft":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Submission is not ready for review.")
        opportunity = await self.opportunity_repository.get(submission.opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")
        if opportunity.employer_id != self.employer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to review this submission.")
        return submission, opportunity

    async def _match_response_from_stored(self, match: Match) -> MatchResponse:
        opportunity = await self.opportunity_repository.get(match.opportunity_id)
        if not opportunity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")
        return self._match_response(match, opportunity)

    def _match_response(self, match: Match, opportunity: Opportunity) -> MatchResponse:
        return MatchResponse(
            id=match.id,
            opportunity=self._opportunity_response(opportunity),
            candidate=self._candidate_response(match.candidate_id),
            submissionId=match.submission_id,
            createdAt=match.created_at,
            status=match.status,
        )

    def _opportunity_response(self, opportunity: Opportunity) -> OpportunityResponse:
        return opportunity_response(opportunity, self.employer)

    def _candidate_response(self, candidate_id: str) -> CandidateResponse:
        if candidate_id == self.candidate.id:
            return candidate_response(self.candidate)
        return CandidateResponse(
            id=candidate_id,
            name="Candidate",
            avatarUrl=f"https://api.dicebear.com/9.x/avataaars/svg?seed={candidate_id}",
            headline="Technical challenge submitter",
            location="Remote",
            skills=[],
            githubUsername=None,
        )
