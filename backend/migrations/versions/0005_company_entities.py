"""Restrict entities to company relationship roles.

Revision ID: 0005_company_entities
Revises: 0004_position_snapshot_job_id
Create Date: 2026-05-16 00:00:00.000000
"""

from alembic import op


revision = "0005_company_entities"
down_revision = "0004_position_snapshot_job_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE relationships SET relationship_type = 'owner' WHERE relationship_type = 'registered_owner'")
    op.execute("DELETE FROM relationships WHERE relationship_type NOT IN ('owner', 'operator', 'ship_manager', 'ism_manager')")
    op.execute("UPDATE entities SET entity_type = 'company' WHERE entity_type = 'organization'")
    op.execute("DELETE FROM entities WHERE entity_type <> 'company'")
    op.execute(
        """
        DELETE FROM entities
        WHERE NOT EXISTS (
            SELECT 1
            FROM relationships
            WHERE relationships.to_entity_id = entities.id
              AND relationships.relationship_type IN ('owner', 'operator', 'ship_manager', 'ism_manager')
        )
        """
    )


def downgrade() -> None:
    op.execute("UPDATE entities SET entity_type = 'organization' WHERE entity_type = 'company'")
    op.execute("UPDATE relationships SET relationship_type = 'registered_owner' WHERE relationship_type = 'owner'")
