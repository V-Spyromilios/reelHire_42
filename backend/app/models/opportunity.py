import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"opp-{uuid.uuid4().hex[:12]}")
    employer_id: Mapped[str] = mapped_column(String(64), index=True)
    company_name: Mapped[str] = mapped_column(String(160))
    role_title: Mapped[str] = mapped_column(String(160))
    short_description: Mapped[str] = mapped_column(Text)
    challenge_title: Mapped[str] = mapped_column(String(200))
    challenge_description: Mapped[str] = mapped_column(Text)
    skills: Mapped[list[str]] = mapped_column(JSONB, default=list)
    location: Mapped[str] = mapped_column(String(160))
    work_mode: Mapped[str] = mapped_column(String(24))
    expected_challenge_duration: Mapped[str] = mapped_column(String(80))
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str] = mapped_column(String(32), default="published", index=True)

    pitch_video_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pitch_video_secure_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    pitch_video_duration_seconds: Mapped[float | None] = mapped_column(nullable=True)
    pitch_video_format: Mapped[str | None] = mapped_column(String(32), nullable=True)
    pitch_video_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pitch_video_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pitch_video_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pitch_video_created_at: Mapped[str | None] = mapped_column(String(80), nullable=True)

    submissions = relationship("Submission", back_populates="opportunity", cascade="all, delete-orphan")


class CandidateReaction(Base):
    __tablename__ = "candidate_reactions"
    __table_args__ = (UniqueConstraint("candidate_id", "opportunity_id", name="uq_candidate_reaction_opportunity"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"cr-{uuid.uuid4().hex[:12]}")
    candidate_id: Mapped[str] = mapped_column(String(64), index=True)
    opportunity_id: Mapped[str] = mapped_column(String(64), index=True)
    reaction: Mapped[str] = mapped_column(String(24))
    watch_time_ms: Mapped[int] = mapped_column(Integer)
    video_duration_ms: Mapped[int] = mapped_column(Integer)
    reacted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
