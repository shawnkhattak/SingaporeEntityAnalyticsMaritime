"""Add port proximity tracking fields.

Revision ID: 0010_port_proximity_tracking
Revises: 0009_ai_news_overviews
Create Date: 2026-05-20 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "0010_port_proximity_tracking"
down_revision = "0009_ai_news_overviews"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vessels", sa.Column("current_port_code", sa.String(length=128), nullable=True))
    op.add_column("vessels", sa.Column("current_port_name", sa.String(length=255), nullable=True))
    op.add_column("vessels", sa.Column("current_port_distance_m", sa.Numeric(8, 1), nullable=True))
    op.add_column("vessels", sa.Column("current_port_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("port_events", sa.Column("distance_meters", sa.Numeric(8, 1), nullable=True))
    op.create_index("ix_port_events_vessel_type_time", "port_events", ["vessel_id", "event_type", "event_time"])
    op.create_index("ix_vessels_current_port_code", "vessels", ["current_port_code"])


def downgrade() -> None:
    op.drop_index("ix_vessels_current_port_code", table_name="vessels")
    op.drop_index("ix_port_events_vessel_type_time", table_name="port_events")
    op.drop_column("port_events", "distance_meters")
    op.drop_column("vessels", "current_port_updated_at")
    op.drop_column("vessels", "current_port_distance_m")
    op.drop_column("vessels", "current_port_name")
    op.drop_column("vessels", "current_port_code")

