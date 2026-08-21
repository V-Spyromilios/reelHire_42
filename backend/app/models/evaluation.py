import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProjectEvaluation(Base):
    __tablename__ = "project_evaluations"
    __table_args__ = (UniqueConstraint("submission_id", name="uq_project_evaluation_submission"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"pe-{uuid.uuid4().hex[:12]}")
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), index=True)
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    challenge_completion: Mapped[int] = mapped_column(Integer, default=0)
    code_quality: Mapped[int] = mapped_column(Integer, default=0)
    architecture: Mapped[int] = mapped_column(Integer, default=0)
    testing: Mapped[int] = mapped_column(Integer, default=0)
    documentation: Mapped[int] = mapped_column(Integer, default=0)
    summary: Mapped[str] = mapped_column(Text, default="")
    strengths: Mapped[list[str]] = mapped_column(JSONB, default=list)
    concerns: Mapped[list[str]] = mapped_column(JSONB, default=list)
    evidence: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(32), default="completed", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    submission = relationship("Submission")
