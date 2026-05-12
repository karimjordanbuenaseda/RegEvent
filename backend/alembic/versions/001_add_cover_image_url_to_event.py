"""add cover_image_url to eventlayout

Revision ID: 001
Revises:
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('eventlayout', sa.Column('cover_image_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('eventlayout', 'cover_image_url')
