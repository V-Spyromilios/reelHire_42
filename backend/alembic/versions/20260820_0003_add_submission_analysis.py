"""add persisted repository analysis to submissions

Revision ID: 20260820_0003
Revises: 20260820_0002
Create Date: 2026-08-20
"""

import sqlalchemy as sa
from alembic import op


revision = "20260820_0003"
down_revision = "20260820_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The first unpublished feature-branch revision used 0002 for these
    # columns before upstream assigned 0002 to candidate withdrawal. Keep the
    # final migration safe for a database that briefly ran that branch build.
    op.execute("ALTER TABLE candidate_reactions ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ")
    op.execute("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS analysis JSONB")
    op.execute("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS analysis_error TEXT")
    op.execute("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS analysis_model VARCHAR(255)")
    op.execute("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS analysis_commit_sha VARCHAR(64)")
    op.execute("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS analysis_run_id VARCHAR(64)")
    op.execute("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ")
    op.execute("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS analysis_evaluated_at TIMESTAMPTZ")
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
