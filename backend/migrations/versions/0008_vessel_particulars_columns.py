"""Add particulars columns to vessels and backfill from source_observations.

Revision ID: 0008_vessel_particulars
Revises: 0007_source_obs_imo_idx
Create Date: 2026-05-17 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op


revision = "0008_vessel_particulars"
down_revision = "0007_source_obs_imo_idx"
branch_labels = None
depends_on = None


NEW_COLUMNS = (
    ("year_built", sa.Integer()),
    ("deadweight", sa.Integer()),
    ("gross_tonnage", sa.Integer()),
    ("net_tonnage", sa.Integer()),
    ("length_meters", sa.Numeric(8, 2)),
    ("breadth_meters", sa.Numeric(8, 2)),
    ("depth_meters", sa.Numeric(8, 2)),
)


def upgrade() -> None:
    for name, type_ in NEW_COLUMNS:
        op.add_column("vessels", sa.Column(name, type_, nullable=True))

    # Backfill from the most recent OCEANS-X vessel_particulars observation
    # per vessel (matched on IMO). Cast first to text then to numeric so
    # mixed-type payloads don't break the migration.
    op.execute(
        """
        WITH latest_particulars AS (
            SELECT DISTINCT ON (raw_payload->>'imoNumber')
                raw_payload->>'imoNumber'   AS imo,
                raw_payload->>'yearBuilt'   AS year_built,
                raw_payload->>'deadweight'  AS deadweight,
                raw_payload->>'grossTonnage' AS gross_tonnage,
                raw_payload->>'netTonnage'  AS net_tonnage,
                raw_payload->>'vesselLength'  AS length_m,
                raw_payload->>'vesselBreadth' AS breadth_m,
                raw_payload->>'vesselDepth'   AS depth_m
            FROM source_observations
            WHERE source = 'OCEANS-X'
              AND observation_type = 'vessel_particulars'
              AND raw_payload ? 'imoNumber'
            ORDER BY raw_payload->>'imoNumber', fetched_at DESC
        )
        UPDATE vessels v SET
            year_built     = NULLIF(lp.year_built, '')::int,
            deadweight     = NULLIF(lp.deadweight, '')::int,
            gross_tonnage  = NULLIF(lp.gross_tonnage, '')::int,
            net_tonnage    = NULLIF(lp.net_tonnage, '')::int,
            length_meters  = NULLIF(lp.length_m, '')::numeric,
            breadth_meters = NULLIF(lp.breadth_m, '')::numeric,
            depth_meters   = NULLIF(lp.depth_m, '')::numeric
        FROM latest_particulars lp
        WHERE v.imo = lp.imo
        """
    )


def downgrade() -> None:
    for name, _ in reversed(NEW_COLUMNS):
        op.drop_column("vessels", name)
