"""add candidate reaction withdrawal state

Revision ID: 20260820_0002
Revises: 20260820_0001
Create Date: 2026-08-20
"""

from alembic import op
import sqlalchemy as sa


revision = "20260820_0002"
down_revision = "20260820_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidate_reactions", sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("candidate_reactions", "withdrawn_at")
