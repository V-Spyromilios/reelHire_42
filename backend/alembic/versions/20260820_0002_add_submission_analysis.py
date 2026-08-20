"""add persisted repository analysis to submissions

Revision ID: 20260820_0002
Revises: 20260820_0001
Create Date: 2026-08-20
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260820_0002"
down_revision = "20260820_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("submissions", sa.Column("analysis", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("submissions", sa.Column("analysis_error", sa.Text(), nullable=True))
    op.add_column("submissions", sa.Column("analysis_model", sa.String(length=255), nullable=True))
    op.add_column("submissions", sa.Column("analysis_commit_sha", sa.String(length=64), nullable=True))
    op.add_column("submissions", sa.Column("analysis_run_id", sa.String(length=64), nullable=True))
    op.add_column("submissions", sa.Column("analysis_started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("submissions", sa.Column("analysis_evaluated_at", sa.DateTime(timezone=True), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE submissions
            SET status = 'analysis_pending',
                analysis_run_id = 'analysis-' || md5(random()::text || clock_timestamp()::text || id)
            WHERE status IN ('submitted', 'analysis_pending', 'analysis_complete')
              AND analysis IS NULL
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE submissions
            SET status = 'submitted'
            WHERE status IN ('analysis_pending', 'analysis_complete', 'analysis_failed')
            """
        )
    )
    op.drop_column("submissions", "analysis_evaluated_at")
    op.drop_column("submissions", "analysis_started_at")
    op.drop_column("submissions", "analysis_run_id")
    op.drop_column("submissions", "analysis_commit_sha")
    op.drop_column("submissions", "analysis_model")
    op.drop_column("submissions", "analysis_error")
    op.drop_column("submissions", "analysis")
