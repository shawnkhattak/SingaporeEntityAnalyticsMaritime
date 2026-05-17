"""Index source observation record prefixes.

Revision ID: 0006_source_obs_prefix_idx
Revises: 0005_company_entities
Create Date: 2026-05-17 00:00:00.000000
"""

from alembic import op


revision = "0006_source_obs_prefix_idx"
down_revision = "0005_company_entities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_source_observations_source_record_id_pattern
        ON source_observations (source_record_id text_pattern_ops)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_source_observations_source_record_id_pattern")
