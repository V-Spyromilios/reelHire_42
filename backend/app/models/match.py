import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EmployerReaction(Base):
    __tablename__ = "employer_reactions"
    __table_args__ = (UniqueConstraint("employer_id", "submission_id", name="uq_employer_reaction_submission"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"er-{uuid.uuid4().hex[:12]}")
    employer_id: Mapped[str] = mapped_column(String(64), index=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    reaction: Mapped[str] = mapped_column(String(24))
    reacted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("submission_id", name="uq_match_submission"),
        UniqueConstraint("opportunity_id", "candidate_id", "employer_id", name="uq_match_opportunity_candidate_employer"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"match-{uuid.uuid4().hex[:12]}")
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    candidate_id: Mapped[str] = mapped_column(String(64), index=True)
    employer_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str] = mapped_column(String(32), default="matched", index=True)
