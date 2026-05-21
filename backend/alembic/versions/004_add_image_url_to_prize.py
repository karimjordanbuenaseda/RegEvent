"""add image_url to prize

Revision ID: 004
Revises: 003
Create Date: 2026-05-21
"""
from alembic import op

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE prize ADD COLUMN IF NOT EXISTS image_url VARCHAR")


def downgrade() -> None:
    op.execute("ALTER TABLE prize DROP COLUMN IF EXISTS image_url")
