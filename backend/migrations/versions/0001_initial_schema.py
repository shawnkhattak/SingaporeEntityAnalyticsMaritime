"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-10
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "vessels",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("imo", sa.String(length=16), nullable=True),
        sa.Column("mmsi", sa.String(length=16), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("call_sign", sa.String(length=32), nullable=True),
        sa.Column("flag_country_code", sa.String(length=8), nullable=True),
        sa.Column("vessel_type_code", sa.String(length=64), nullable=True),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("imo IS NOT NULL OR mmsi IS NOT NULL OR call_sign IS NOT NULL", name="ck_vessels_identity_present"),
    )
    op.create_index("ix_vessels_imo", "vessels", ["imo"], unique=True, postgresql_where=sa.text("imo IS NOT NULL"))
    op.create_index("ix_vessels_mmsi", "vessels", ["mmsi"], unique=False)
    op.create_index("ix_vessels_name", "vessels", ["name"], unique=False)

    op.create_table(
        "reference_data",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("domain", sa.String(length=64), nullable=False),
        sa.Column("code", sa.String(length=128), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("domain", "code", name="uq_reference_data_domain_code"),
    )

    op.create_table(
        "entities",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("country_code", sa.String(length=8), nullable=True),
        sa.Column("external_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("entity_type", "name", "country_code", name="uq_entities_type_name_country"),
    )
    op.create_index("ix_entities_name", "entities", ["name"], unique=False)

    op.create_table(
        "ingestion_jobs",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("job_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("requested_by", sa.String(length=80), nullable=True),
        sa.Column("parameters", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_ingestion_jobs_job_type", "ingestion_jobs", ["job_type"], unique=False)
    op.create_index("ix_ingestion_jobs_status", "ingestion_jobs", ["status"], unique=False)

    op.create_table(
        "source_health",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("source", name="uq_source_health_source"),
    )

    op.create_table(
        "source_observations",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("observation_type", sa.String(length=80), nullable=False),
        sa.Column("source_record_id", sa.String(length=255), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.UniqueConstraint("source", "observation_type", "payload_hash", name="uq_source_observations_payload"),
    )
    op.create_index("ix_source_observations_source_type", "source_observations", ["source", "observation_type"], unique=False)

    op.create_table(
        "vessel_positions_latest",
        sa.Column("vessel_id", sa.BigInteger(), sa.ForeignKey("vessels.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("position", sa.Text(), nullable=True),
        sa.Column("speed_knots", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("course_degrees", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("heading_degrees", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("navigational_status", sa.String(length=128), nullable=True),
        sa.Column("position_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("evidence_id", sa.BigInteger(), sa.ForeignKey("source_observations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_vessel_positions_latest_timestamp", "vessel_positions_latest", ["position_timestamp"], unique=False)
    op.execute("CREATE INDEX ix_vessel_positions_latest_geom ON vessel_positions_latest USING GIST (ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326))")

    op.create_table(
        "port_events",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("vessel_id", sa.BigInteger(), sa.ForeignKey("vessels.id", ondelete="SET NULL"), nullable=True),
        sa.Column("port_code", sa.String(length=64), nullable=True),
        sa.Column("port_name", sa.String(length=255), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("event_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence_id", sa.BigInteger(), sa.ForeignKey("source_observations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_port_events_vessel_id", "port_events", ["vessel_id"], unique=False)
    op.create_index("ix_port_events_event_time", "port_events", ["event_time"], unique=False)

    op.create_table(
        "relationships",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("from_entity_id", sa.BigInteger(), sa.ForeignKey("entities.id", ondelete="CASCADE"), nullable=True),
        sa.Column("to_entity_id", sa.BigInteger(), sa.ForeignKey("entities.id", ondelete="CASCADE"), nullable=True),
        sa.Column("vessel_id", sa.BigInteger(), sa.ForeignKey("vessels.id", ondelete="CASCADE"), nullable=True),
        sa.Column("relationship_type", sa.String(length=80), nullable=False),
        sa.Column("evidence_id", sa.BigInteger(), sa.ForeignKey("source_observations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("evidence_summary", sa.Text(), nullable=True),
        sa.Column("confidence", sa.String(length=32), nullable=False, server_default="observed"),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("vessel_id IS NOT NULL OR from_entity_id IS NOT NULL", name="ck_relationships_subject_present"),
        sa.CheckConstraint("to_entity_id IS NOT NULL OR vessel_id IS NOT NULL", name="ck_relationships_target_present"),
    )
    op.create_index("ix_relationships_vessel_id", "relationships", ["vessel_id"], unique=False)
    op.create_index("ix_relationships_from_entity_id", "relationships", ["from_entity_id"], unique=False)
    op.create_index("ix_relationships_to_entity_id", "relationships", ["to_entity_id"], unique=False)

    op.create_table(
        "risk_flags",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("vessel_id", sa.BigInteger(), sa.ForeignKey("vessels.id", ondelete="CASCADE"), nullable=True),
        sa.Column("entity_id", sa.BigInteger(), sa.ForeignKey("entities.id", ondelete="CASCADE"), nullable=True),
        sa.Column("flag_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("evidence_id", sa.BigInteger(), sa.ForeignKey("source_observations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("vessel_id IS NOT NULL OR entity_id IS NOT NULL", name="ck_risk_flags_subject_present"),
    )
    op.create_index("ix_risk_flags_vessel_id", "risk_flags", ["vessel_id"], unique=False)
    op.create_index("ix_risk_flags_entity_id", "risk_flags", ["entity_id"], unique=False)
    op.create_index("ix_risk_flags_status", "risk_flags", ["status"], unique=False)

    op.create_table(
        "sanctions_records",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("entity_id", sa.BigInteger(), sa.ForeignKey("entities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("program", sa.String(length=255), nullable=True),
        sa.Column("matched_name", sa.String(length=255), nullable=False),
        sa.Column("confidence", sa.String(length=32), nullable=False),
        sa.Column("evidence_id", sa.BigInteger(), sa.ForeignKey("source_observations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_sanctions_records_entity_id", "sanctions_records", ["entity_id"], unique=False)

    op.create_table(
        "news_articles",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("url", name="uq_news_articles_url"),
    )
    op.create_index("ix_news_articles_published_at", "news_articles", ["published_at"], unique=False)

    op.create_table(
        "ingestion_logs",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("ingestion_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("level", sa.String(length=16), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_ingestion_logs_job_id", "ingestion_logs", ["job_id"], unique=False)


def downgrade() -> None:
    op.drop_table("ingestion_logs")
    op.drop_table("news_articles")
    op.drop_table("sanctions_records")
    op.drop_table("risk_flags")
    op.drop_table("relationships")
    op.drop_table("port_events")
    op.execute("DROP INDEX IF EXISTS ix_vessel_positions_latest_geom")
    op.drop_table("vessel_positions_latest")
    op.drop_table("source_observations")
    op.drop_table("source_health")
    op.drop_table("ingestion_jobs")
    op.drop_table("entities")
    op.drop_table("reference_data")
    op.drop_table("vessels")
    op.execute("DROP EXTENSION IF EXISTS postgis")
