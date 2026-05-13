"""add cover_image_url to eventlayout

Revision ID: 001
Revises:
Create Date: 2026-05-12
"""
from alembic import op

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE eventlayout ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR")


def downgrade() -> None:
    op.execute("ALTER TABLE eventlayout DROP COLUMN IF EXISTS cover_image_url")
