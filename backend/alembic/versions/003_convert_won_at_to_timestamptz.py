"""convert won_at to timestamptz

Revision ID: 003
Revises: 002
Create Date: 2026-05-14
"""
from alembic import op

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent: only converts if column is still naive TIMESTAMP
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'attendee'
                  AND column_name = 'won_at'
                  AND data_type = 'timestamp without time zone'
            ) THEN
                ALTER TABLE attendee
                    ALTER COLUMN won_at TYPE TIMESTAMPTZ
                    USING won_at AT TIME ZONE 'UTC';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'attendee'
                  AND column_name = 'won_at'
                  AND data_type = 'timestamp with time zone'
            ) THEN
                ALTER TABLE attendee
                    ALTER COLUMN won_at TYPE TIMESTAMP
                    USING won_at AT TIME ZONE 'UTC';
            END IF;
        END $$;
    """)
