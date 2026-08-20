import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("candidate_id", "opportunity_id", name="uq_candidate_submission_opportunity"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"sub-{uuid.uuid4().hex[:12]}")
    candidate_id: Mapped[str] = mapped_column(String(64), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    github_url: Mapped[str] = mapped_column(Text)

    explanation_video_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    explanation_video_secure_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation_video_duration_seconds: Mapped[float | None] = mapped_column(nullable=True)
    explanation_video_format: Mapped[str | None] = mapped_column(String(32), nullable=True)
    explanation_video_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    explanation_video_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    explanation_video_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    explanation_video_created_at: Mapped[str | None] = mapped_column(String(80), nullable=True)

    status: Mapped[str] = mapped_column(String(32), default="submitted", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    opportunity = relationship("Opportunity", back_populates="submissions")
