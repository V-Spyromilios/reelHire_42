import uuid

from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.opportunity import CandidateReaction, Opportunity


class OpportunityRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_employer(self, employer_id: str) -> list[Opportunity]:
        result = await self.session.scalars(
            select(Opportunity)
            .where(Opportunity.employer_id == employer_id, Opportunity.status == "published")
            .order_by(Opportunity.created_at.desc())
        )
        return list(result)

    async def list_feed(self, candidate_id: str) -> list[Opportunity]:
        active_acceptance_exists = (
            select(CandidateReaction.id)
            .where(
                CandidateReaction.candidate_id == candidate_id,
                CandidateReaction.opportunity_id == Opportunity.id,
                CandidateReaction.reaction == "accepted",
                CandidateReaction.withdrawn_at.is_(None),
            )
            .exists()
        )
        result = await self.session.scalars(
            select(Opportunity)
            .where(Opportunity.status == "published", ~active_acceptance_exists)
            .order_by(Opportunity.created_at.desc())
        )
        return list(result)

    async def get(self, opportunity_id: str) -> Opportunity | None:
        return await self.session.get(Opportunity, opportunity_id)

    async def add(self, opportunity: Opportunity) -> Opportunity:
        self.session.add(opportunity)
        await self.session.flush()
        await self.session.refresh(opportunity)
        return opportunity

    async def delete_candidate_reactions(self, opportunity_id: str) -> None:
        await self.session.execute(delete(CandidateReaction).where(CandidateReaction.opportunity_id == opportunity_id))

    async def delete(self, opportunity: Opportunity) -> None:
        await self.session.delete(opportunity)
        await self.session.flush()

    async def upsert_candidate_reaction(self, reaction: CandidateReaction) -> CandidateReaction:
        reaction_id = reaction.id or f"cr-{uuid.uuid4().hex[:12]}"
        statement = (
            insert(CandidateReaction)
            .values(
                id=reaction_id,
                candidate_id=reaction.candidate_id,
                opportunity_id=reaction.opportunity_id,
                reaction=reaction.reaction,
                watch_time_ms=reaction.watch_time_ms,
                video_duration_ms=reaction.video_duration_ms,
                reacted_at=reaction.reacted_at,
            )
            .on_conflict_do_update(
                constraint="uq_candidate_reaction_opportunity",
                set_={
                    "reaction": reaction.reaction,
                    "watch_time_ms": reaction.watch_time_ms,
                    "video_duration_ms": reaction.video_duration_ms,
                    "reacted_at": reaction.reacted_at,
                    "withdrawn_at": None,
                },
            )
            .returning(CandidateReaction)
        )
        result = await self.session.scalars(statement)
        return result.one()

    async def accepted_for_candidate(self, candidate_id: str) -> list[Opportunity]:
        result = await self.session.scalars(
            select(Opportunity)
            .join(CandidateReaction, CandidateReaction.opportunity_id == Opportunity.id)
            .where(
                CandidateReaction.candidate_id == candidate_id,
                CandidateReaction.reaction == "accepted",
                CandidateReaction.withdrawn_at.is_(None),
            )
            .order_by(Opportunity.created_at.desc())
        )
        return list(result)

    async def reactions_for_opportunity(self, opportunity_id: str) -> list[CandidateReaction]:
        result = await self.session.scalars(
            select(CandidateReaction)
            .where(CandidateReaction.opportunity_id == opportunity_id)
            .order_by(CandidateReaction.reacted_at.asc())
        )
        return list(result)

    async def has_active_accepted_reaction(self, candidate_id: str, opportunity_id: str) -> bool:
        result = await self.session.scalars(
            select(CandidateReaction.id)
            .where(
                CandidateReaction.candidate_id == candidate_id,
                CandidateReaction.opportunity_id == opportunity_id,
                CandidateReaction.reaction == "accepted",
                CandidateReaction.withdrawn_at.is_(None),
            )
            .limit(1)
        )
        return result.first() is not None

    async def withdraw_candidate_reaction(
        self,
        candidate_id: str,
        opportunity_id: str,
        withdrawn_at: datetime,
    ) -> CandidateReaction | None:
        statement = (
            update(CandidateReaction)
            .where(
                CandidateReaction.candidate_id == candidate_id,
                CandidateReaction.opportunity_id == opportunity_id,
                CandidateReaction.reaction == "accepted",
                CandidateReaction.withdrawn_at.is_(None),
            )
            .values(withdrawn_at=withdrawn_at)
            .returning(CandidateReaction)
        )
        result = await self.session.scalars(statement)
        return result.first()
