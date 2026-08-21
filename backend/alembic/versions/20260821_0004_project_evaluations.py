"""add project evaluations

Revision ID: 20260821_0004
Revises: 20260821_0003
Create Date: 2026-08-21 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260821_0004"
down_revision: str | None = "20260821_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "project_evaluations",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("submission_id", sa.String(length=64), nullable=False),
        sa.Column("overall_score", sa.Integer(), nullable=True),
        sa.Column("challenge_completion", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("code_quality", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("architecture", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("testing", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("documentation", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("strengths", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("concerns", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="completed"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", name="uq_project_evaluation_submission"),
    )
    op.create_index(op.f("ix_project_evaluations_status"), "project_evaluations", ["status"], unique=False)
    op.create_index(op.f("ix_project_evaluations_submission_id"), "project_evaluations", ["submission_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_project_evaluations_submission_id"), table_name="project_evaluations")
    op.drop_index(op.f("ix_project_evaluations_status"), table_name="project_evaluations")
    op.drop_table("project_evaluations")
