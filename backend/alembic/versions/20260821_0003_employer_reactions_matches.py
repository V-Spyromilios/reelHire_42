"""add employer reactions and matches

Revision ID: 20260821_0003
Revises: 20260820_0002
Create Date: 2026-08-21
"""

from alembic import op
import sqlalchemy as sa


revision = "20260821_0003"
down_revision = "20260820_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "employer_reactions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("employer_id", sa.String(length=64), nullable=False),
        sa.Column("submission_id", sa.String(length=64), nullable=False),
        sa.Column("reaction", sa.String(length=24), nullable=False),
        sa.Column("reacted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employer_id", "submission_id", name="uq_employer_reaction_submission"),
    )
    op.create_index("ix_employer_reactions_employer_id", "employer_reactions", ["employer_id"])
    op.create_index("ix_employer_reactions_submission_id", "employer_reactions", ["submission_id"])

    op.create_table(
        "matches",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("opportunity_id", sa.String(length=64), nullable=False),
        sa.Column("submission_id", sa.String(length=64), nullable=False),
        sa.Column("candidate_id", sa.String(length=64), nullable=False),
        sa.Column("employer_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", name="uq_match_submission"),
        sa.UniqueConstraint("opportunity_id", "candidate_id", "employer_id", name="uq_match_opportunity_candidate_employer"),
    )
    op.create_index("ix_matches_candidate_id", "matches", ["candidate_id"])
    op.create_index("ix_matches_employer_id", "matches", ["employer_id"])
    op.create_index("ix_matches_opportunity_id", "matches", ["opportunity_id"])
    op.create_index("ix_matches_status", "matches", ["status"])
    op.create_index("ix_matches_submission_id", "matches", ["submission_id"])


def downgrade() -> None:
    op.drop_index("ix_matches_submission_id", table_name="matches")
    op.drop_index("ix_matches_status", table_name="matches")
    op.drop_index("ix_matches_opportunity_id", table_name="matches")
    op.drop_index("ix_matches_employer_id", table_name="matches")
    op.drop_index("ix_matches_candidate_id", table_name="matches")
    op.drop_table("matches")
    op.drop_index("ix_employer_reactions_submission_id", table_name="employer_reactions")
    op.drop_index("ix_employer_reactions_employer_id", table_name="employer_reactions")
    op.drop_table("employer_reactions")
