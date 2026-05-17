"""Index source observation IMO token.

Revision ID: 0007_source_obs_imo_idx
Revises: 0006_source_obs_prefix_idx
Create Date: 2026-05-17 00:00:00.000000
"""

from alembic import op


revision = "0007_source_obs_imo_idx"
down_revision = "0006_source_obs_prefix_idx"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_source_observations_source_record_imo
        ON source_observations ((split_part(source_record_id, '|', 1)))
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_source_observations_source_record_imo")
