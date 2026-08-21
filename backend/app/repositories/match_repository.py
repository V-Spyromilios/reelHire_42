import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.match import EmployerReaction, Match


class MatchRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_employer_reaction(self, employer_id: str, submission_id: str) -> EmployerReaction | None:
        result = await self.session.scalars(
            select(EmployerReaction).where(
                EmployerReaction.employer_id == employer_id,
                EmployerReaction.submission_id == submission_id,
            )
        )
        return result.first()

    async def get_employer_reaction_for_submission(self, submission_id: str) -> EmployerReaction | None:
        result = await self.session.scalars(
            select(EmployerReaction)
            .where(EmployerReaction.submission_id == submission_id)
            .order_by(EmployerReaction.updated_at.desc())
            .limit(1)
        )
        return result.first()

    async def upsert_employer_reaction(self, reaction: EmployerReaction) -> EmployerReaction:
        reaction_id = reaction.id or f"er-{uuid.uuid4().hex[:12]}"
        statement = (
            insert(EmployerReaction)
            .values(
                id=reaction_id,
                employer_id=reaction.employer_id,
                submission_id=reaction.submission_id,
                reaction=reaction.reaction,
                reacted_at=reaction.reacted_at,
                updated_at=reaction.updated_at,
            )
            .on_conflict_do_update(
                constraint="uq_employer_reaction_submission",
                set_={
                    "reaction": reaction.reaction,
                    "updated_at": reaction.updated_at,
                },
            )
            .returning(EmployerReaction)
        )
        result = await self.session.scalars(statement)
        return result.one()

    async def get_match(self, match_id: str) -> Match | None:
        return await self.session.get(Match, match_id)

    async def get_match_by_submission(self, submission_id: str) -> Match | None:
        result = await self.session.scalars(select(Match).where(Match.submission_id == submission_id).limit(1))
        return result.first()

    async def get_or_create_match(
        self,
        *,
        opportunity_id: str,
        submission_id: str,
        candidate_id: str,
        employer_id: str,
        created_at: datetime,
    ) -> Match:
        match_id = f"match-{uuid.uuid4().hex[:12]}"
        statement = (
            insert(Match)
            .values(
                id=match_id,
                opportunity_id=opportunity_id,
                submission_id=submission_id,
                candidate_id=candidate_id,
                employer_id=employer_id,
                status="matched",
                created_at=created_at,
            )
            .on_conflict_do_nothing(constraint="uq_match_submission")
            .returning(Match)
        )
        result = await self.session.scalars(statement)
        created = result.first()
        if created:
            return created
        existing = await self.get_match_by_submission(submission_id)
        if existing is None:
            raise RuntimeError("Match could not be created or loaded.")
        return existing

    async def list_for_employer(self, employer_id: str) -> list[Match]:
        result = await self.session.scalars(
            select(Match).where(Match.employer_id == employer_id).order_by(Match.created_at.desc())
        )
        return list(result)

    async def list_for_candidate(self, candidate_id: str) -> list[Match]:
        result = await self.session.scalars(
            select(Match).where(Match.candidate_id == candidate_id).order_by(Match.created_at.desc())
        )
        return list(result)

    async def request_interview(self, match_id: str) -> Match | None:
        statement = (
            update(Match)
            .where(Match.id == match_id)
            .values(status="interview_requested")
            .returning(Match)
        )
        result = await self.session.scalars(statement)
        return result.first()
