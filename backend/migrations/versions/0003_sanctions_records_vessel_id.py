"""add vessel link to sanctions records

Revision ID: 0003_sanctions_records_vessel_id
Revises: 0002_news_links
Create Date: 2026-05-11
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0003_sanctions_records_vessel_id"
down_revision: str | None = "0002_news_links"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("sanctions_records", sa.Column("vessel_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_sanctions_records_vessel_id_vessels",
        "sanctions_records",
        "vessels",
        ["vessel_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_sanctions_records_vessel_id", "sanctions_records", ["vessel_id"])


def downgrade() -> None:
    op.drop_index("ix_sanctions_records_vessel_id", table_name="sanctions_records")
    op.drop_constraint("fk_sanctions_records_vessel_id_vessels", "sanctions_records", type_="foreignkey")
    op.drop_column("sanctions_records", "vessel_id")
