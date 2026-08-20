"""initial video upload schema

Revision ID: 20260820_0001
Revises:
Create Date: 2026-08-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260820_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "opportunities",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("employer_id", sa.String(length=64), nullable=False),
        sa.Column("company_name", sa.String(length=160), nullable=False),
        sa.Column("role_title", sa.String(length=160), nullable=False),
        sa.Column("short_description", sa.Text(), nullable=False),
        sa.Column("challenge_title", sa.String(length=200), nullable=False),
        sa.Column("challenge_description", sa.Text(), nullable=False),
        sa.Column("skills", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("location", sa.String(length=160), nullable=False),
        sa.Column("work_mode", sa.String(length=24), nullable=False),
        sa.Column("expected_challenge_duration", sa.String(length=80), nullable=False),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("pitch_video_public_id", sa.String(length=255), nullable=True),
        sa.Column("pitch_video_secure_url", sa.Text(), nullable=True),
        sa.Column("pitch_video_duration_seconds", sa.Float(), nullable=True),
        sa.Column("pitch_video_format", sa.String(length=32), nullable=True),
        sa.Column("pitch_video_bytes", sa.Integer(), nullable=True),
        sa.Column("pitch_video_width", sa.Integer(), nullable=True),
        sa.Column("pitch_video_height", sa.Integer(), nullable=True),
        sa.Column("pitch_video_created_at", sa.String(length=80), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_opportunities_employer_id", "opportunities", ["employer_id"])
    op.create_index("ix_opportunities_status", "opportunities", ["status"])

    op.create_table(
        "candidate_reactions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("candidate_id", sa.String(length=64), nullable=False),
        sa.Column("opportunity_id", sa.String(length=64), nullable=False),
        sa.Column("reaction", sa.String(length=24), nullable=False),
        sa.Column("watch_time_ms", sa.Integer(), nullable=False),
        sa.Column("video_duration_ms", sa.Integer(), nullable=False),
        sa.Column("reacted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "opportunity_id", name="uq_candidate_reaction_opportunity"),
    )
    op.create_index("ix_candidate_reactions_candidate_id", "candidate_reactions", ["candidate_id"])
    op.create_index("ix_candidate_reactions_opportunity_id", "candidate_reactions", ["opportunity_id"])

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("candidate_id", sa.String(length=64), nullable=False),
        sa.Column("opportunity_id", sa.String(length=64), nullable=False),
        sa.Column("github_url", sa.Text(), nullable=False),
        sa.Column("explanation_video_public_id", sa.String(length=255), nullable=True),
        sa.Column("explanation_video_secure_url", sa.Text(), nullable=True),
        sa.Column("explanation_video_duration_seconds", sa.Float(), nullable=True),
        sa.Column("explanation_video_format", sa.String(length=32), nullable=True),
        sa.Column("explanation_video_bytes", sa.Integer(), nullable=True),
        sa.Column("explanation_video_width", sa.Integer(), nullable=True),
        sa.Column("explanation_video_height", sa.Integer(), nullable=True),
        sa.Column("explanation_video_created_at", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "opportunity_id", name="uq_candidate_submission_opportunity"),
    )
    op.create_index("ix_submissions_candidate_id", "submissions", ["candidate_id"])
    op.create_index("ix_submissions_opportunity_id", "submissions", ["opportunity_id"])
    op.create_index("ix_submissions_status", "submissions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_submissions_status", table_name="submissions")
    op.drop_index("ix_submissions_opportunity_id", table_name="submissions")
    op.drop_index("ix_submissions_candidate_id", table_name="submissions")
    op.drop_table("submissions")
    op.drop_index("ix_candidate_reactions_opportunity_id", table_name="candidate_reactions")
    op.drop_index("ix_candidate_reactions_candidate_id", table_name="candidate_reactions")
    op.drop_table("candidate_reactions")
    op.drop_index("ix_opportunities_status", table_name="opportunities")
    op.drop_index("ix_opportunities_employer_id", table_name="opportunities")
    op.drop_table("opportunities")
