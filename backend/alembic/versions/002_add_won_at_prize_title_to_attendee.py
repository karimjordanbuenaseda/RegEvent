"""add won_at and prize_title to attendee

Revision ID: 002
Revises: 001
Create Date: 2026-05-14
"""
from alembic import op

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE attendee ADD COLUMN IF NOT EXISTS won_at TIMESTAMP")
    op.execute("ALTER TABLE attendee ADD COLUMN IF NOT EXISTS prize_title VARCHAR")


def downgrade() -> None:
    op.execute("ALTER TABLE attendee DROP COLUMN IF EXISTS won_at")
    op.execute("ALTER TABLE attendee DROP COLUMN IF EXISTS prize_title")
