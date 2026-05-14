"""Track latest-position snapshot membership.

Revision ID: 0004_position_snapshot_job_id
Revises: 0003_sanctions_records_vessel_id
Create Date: 2026-05-13 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_position_snapshot_job_id"
down_revision = "0003_sanctions_records_vessel_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vessel_positions_latest", sa.Column("snapshot_job_id", sa.BigInteger(), nullable=True))
    op.create_index("ix_vessel_positions_latest_snapshot_job_id", "vessel_positions_latest", ["snapshot_job_id"])
    op.create_foreign_key(
        "fk_vessel_positions_latest_snapshot_job_id_ingestion_jobs",
        "vessel_positions_latest",
        "ingestion_jobs",
        ["snapshot_job_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_vessel_positions_latest_snapshot_job_id_ingestion_jobs", "vessel_positions_latest", type_="foreignkey")
    op.drop_index("ix_vessel_positions_latest_snapshot_job_id", table_name="vessel_positions_latest")
    op.drop_column("vessel_positions_latest", "snapshot_job_id")
