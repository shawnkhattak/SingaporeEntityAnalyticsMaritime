"""add news links

Revision ID: 0002_news_links
Revises: 0001_initial_schema
Create Date: 2026-05-11
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_news_links"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "news_links",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("article_id", sa.BigInteger(), sa.ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_id", sa.BigInteger(), sa.ForeignKey("entities.id", ondelete="CASCADE"), nullable=True),
        sa.Column("vessel_id", sa.BigInteger(), sa.ForeignKey("vessels.id", ondelete="CASCADE"), nullable=True),
        sa.Column("confidence", sa.String(length=32), nullable=False),
        sa.Column("matched_text", sa.String(length=255), nullable=False),
        sa.Column("evidence_id", sa.BigInteger(), sa.ForeignKey("source_observations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_news_links_article_id", "news_links", ["article_id"])
    op.create_index("ix_news_links_entity_id", "news_links", ["entity_id"])
    op.create_index("ix_news_links_vessel_id", "news_links", ["vessel_id"])


def downgrade() -> None:
    op.drop_table("news_links")
