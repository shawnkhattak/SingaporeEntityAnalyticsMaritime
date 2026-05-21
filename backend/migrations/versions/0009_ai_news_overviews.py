"""Add AI news overview cache table.

Revision ID: 0009_ai_news_overviews
Revises: 0008_vessel_particulars
Create Date: 2026-05-19 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0009_ai_news_overviews"
down_revision = "0008_vessel_particulars"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_news_overviews",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("scope", sa.String(length=80), nullable=False),
        sa.Column("bundle_name", sa.String(length=255), nullable=True),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("article_count", sa.Integer(), nullable=False),
        sa.Column("source_count", sa.Integer(), nullable=False),
        sa.Column("evidence_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("article_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("linked_vessel_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("linked_entity_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("model_provider", sa.String(length=80), nullable=False),
        sa.Column("model_name", sa.String(length=120), nullable=False),
        sa.Column("prompt_version", sa.String(length=80), nullable=False),
        sa.Column("overview_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("debug_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("raw_response", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ai_news_overviews_scope", "ai_news_overviews", ["scope"])
    op.create_index("ix_ai_news_overviews_bundle_name", "ai_news_overviews", ["bundle_name"])
    op.create_index("ix_ai_news_overviews_window_start", "ai_news_overviews", ["window_start"])
    op.create_index("ix_ai_news_overviews_window_end", "ai_news_overviews", ["window_end"])
    op.create_index("ix_ai_news_overviews_input_hash", "ai_news_overviews", ["input_hash"])
    op.create_index("ix_ai_news_overviews_generated_at", "ai_news_overviews", ["generated_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_news_overviews_generated_at", table_name="ai_news_overviews")
    op.drop_index("ix_ai_news_overviews_input_hash", table_name="ai_news_overviews")
    op.drop_index("ix_ai_news_overviews_window_end", table_name="ai_news_overviews")
    op.drop_index("ix_ai_news_overviews_window_start", table_name="ai_news_overviews")
    op.drop_index("ix_ai_news_overviews_bundle_name", table_name="ai_news_overviews")
    op.drop_index("ix_ai_news_overviews_scope", table_name="ai_news_overviews")
    op.drop_table("ai_news_overviews")
